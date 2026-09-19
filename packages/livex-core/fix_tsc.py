import re

def fix_tsc():
    with open('tsc_output.txt', 'r') as f:
        lines = f.readlines()
        
    fixes = {}
    for line in lines:
        match = re.search(r'(.*?)\((\d+),(\d+)\): error TS2663: Cannot find name \'(.*?)\'. Did you mean the instance member \'this\.\4\'?', line)
        if match:
            file = match.group(1).strip()
            line_num = int(match.group(2))
            var_name = match.group(4)
            if file not in fixes:
                fixes[file] = []
            fixes[file].append((line_num, var_name))
            
    for file, file_fixes in fixes.items():
        with open(file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
        for line_num, var_name in file_fixes:
            # line_num is 1-indexed
            idx = line_num - 1
            # Replace var_name with this.var_name but only as a whole word, and avoid replacing if it already has this.
            # E.g. avoid this.this.var_name
            # Regex: lookbehind not a dot, match var_name as word
            lines[idx] = re.sub(rf'(?<!\.)\b{var_name}\b', f'this.{var_name}', lines[idx])
            
        with open(file, 'w', encoding='utf-8') as f:
            f.writelines(lines)

if __name__ == '__main__':
    fix_tsc()
