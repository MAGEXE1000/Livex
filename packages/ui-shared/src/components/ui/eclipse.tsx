import { type ButtonHTMLAttributes, type CSSProperties, useId } from "react";

export interface EclipseProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
  as?: "button" | "span";
  duration?: number;
  /** Whether the toggle should render in its dark-theme state. */
  toggled?: boolean;
  svgClassName?: string;
  [key: `data-${string}`]: string | number | boolean | null | undefined;
}

export function Eclipse({
  as = "button",
  duration = 500,
  toggled,
  className,
  svgClassName,
  type = "button",
  title = "Toggle theme",
  "aria-label": ariaLabel = "Toggle theme",
  "aria-pressed": ariaPressed,
  ...props
}: EclipseProps) {
  const rawId = useId();
  const toggleId = rawId.replace(/:/g, "_");

  const clipMainId = `toggles.dev-eclipse-main-${toggleId}`;
  const Component = as;

  return (
    <Component
      {...(as === "button"
        ? {
            type,
            title,
            "aria-label": ariaLabel,
            "aria-pressed": toggled ?? ariaPressed,
          }
        : {
            "aria-hidden": true,
          })}
      {...props}
      className={[
        className,
        toggled === true ? "dark" : toggled === false ? "light" : undefined,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <svg
        width="1em"
        height="1em"
        viewBox="0 0 32 32"
        aria-hidden="true"
        fill={"currentColor"}
        style={
          { "--toggles-eclipse--duration": `${duration}ms` } as CSSProperties
        }
        className={svgClassName}
      >
        <defs>
          <clipPath id={clipMainId}>
            <path
              d={"M0 0h64v32h-64zm38 16a1 1 0 0020 0 1 1 0 00-20 0"}
              className="origin-center motion-safe:transition-[d,translate] motion-safe:[transition-duration:var(--toggles-eclipse--duration)] motion-safe:[transition-timing-function:cubic-bezier(0,0,0.05,1.15)] motion-safe:[transition-delay:0s] dark:[d:path('M-16_-16h64v64h-64zm22_32a1_1_0_0020_0_1_1_0_00-20_0')] dark:not-supports-[d:path('M0_0')]:-translate-x-[32px] motion-safe:dark:[transition-duration:calc(var(--toggles-eclipse--duration)_*_0.8)] motion-safe:dark:[transition-delay:calc(var(--toggles-eclipse--duration)_*_0.2)]"
            />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipMainId})`}>
          <circle
            cx={16}
            cy={16}
            r={16}
            className="[transform-origin:center] motion-safe:[transition-property:transform] motion-safe:[transition-duration:var(--toggles-eclipse--duration)] motion-safe:[transition-timing-function:cubic-bezier(0,0,0.05,1.15)]"
          />
        </g>
      </svg>
    </Component>
  );
}
