import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { useT, useIsWebDesktop, useScrollHide, useSettingsStore, useShallow } from '@workspace/studio-core';
import { StudioHeader } from '../../../../shared/layout/StudioHeader';
import { useStagexStore, type StagexSubView } from '../../state/useStagexStore';

interface StageSetupHubProps {
  onSelectSubView: (view: StagexSubView) => void;
  isLight?: boolean;
  isAmoled?: boolean;
}

export const StageSetupHub: React.FC<StageSetupHubProps> = ({
  onSelectSubView,
  isLight = false,
  isAmoled = false,
}) => {
  const { riderNeeds, riderChannels, setlist, gear, members } = useStagexStore(
    useShallow((s) => ({
      riderNeeds: s.riderNeeds,
      riderChannels: s.riderChannels,
      setlist: s.setlist,
      gear: s.gear,
      members: s.members,
    }))
  );
  const t = useT();
  const tr = t as any;
  const isWebDesktop = useIsWebDesktop();

  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollHide(scrollRef);

  const currentLang = useSettingsStore((s) => s.settings.language);
  const isSpanish = currentLang === 'es';

  const title = tr.stagex?.setupTitle || (isSpanish ? 'Configuración' : 'Setup');
  const subtitle =
    tr.stagex?.setupSubtitle ||
    (isSpanish
      ? 'Documentos de producción, rider técnico y listas de canciones'
      : 'Show production documents, technical rider & setlists');

  const totalRiderItems = riderNeeds.length + riderChannels.length;
  const cards = [
    {
      id: 'rider' as StagexSubView,
      title: tr.stagex?.techRiderTitle || (isSpanish ? 'Rider Técnico' : 'Technical Rider'),
      desc:
        tr.stagex?.techRiderDesc ||
        (isSpanish
          ? 'Especificaciones de sonido, energía y hospitalidad para producción'
          : 'Hospitality, sound & power specs for production'),
      icon: 'description',
      badge: isSpanish
        ? `${totalRiderItems} ${totalRiderItems === 1 ? 'elemento' : 'elementos'}`
        : `${totalRiderItems} ${totalRiderItems === 1 ? 'Item' : 'Items'}`,
    },
    {
      id: 'setlist' as StagexSubView,
      title: tr.stagex?.setlistTitle || (isSpanish ? 'Setlist' : 'Setlist'),
      desc:
        tr.stagex?.setlistDesc ||
        (isSpanish
          ? 'Orden de canciones, tiempos y dinámica del show'
          : 'Song order, timing & performance flow'),
      icon: 'format_list_numbered',
      badge: isSpanish
        ? `${setlist.length} ${setlist.length === 1 ? 'canción' : 'canciones'}`
        : `${setlist.length} ${setlist.length === 1 ? 'Song' : 'Songs'}`,
    },
    {
      id: 'gear' as StagexSubView,
      title: tr.stagex?.gearTitle || (isSpanish ? 'Equipamiento' : 'Gear'),
      desc:
        tr.stagex?.gearDesc ||
        (isSpanish
          ? 'Instrumentos, amplificadores y lista de carga'
          : 'Instruments, amps & load-in checklist'),
      icon: 'tune',
      badge: isSpanish
        ? `${gear.length} ${gear.length === 1 ? 'elemento' : 'elementos'}`
        : `${gear.length} ${gear.length === 1 ? 'Item' : 'Items'}`,
    },
    {
      id: 'members' as StagexSubView,
      title: tr.stagex?.bandCrewTitle || (isSpanish ? 'Banda y Equipo' : 'Band & Crew'),
      desc:
        tr.stagex?.bandCrewDesc ||
        (isSpanish ? 'Información de integrantes y equipo técnico' : 'Band and crew information'),
      icon: 'badge',
      badge: isSpanish
        ? `${members.length} ${members.length === 1 ? 'miembro' : 'miembros'}`
        : `${members.length} ${members.length === 1 ? 'Member' : 'Members'}`,
    },
  ];

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{
        background: isLight
          ? 'var(--app-bg, #f4f4f5)'
          : isAmoled
            ? '#000000'
            : 'var(--app-bg, #09090b)',
      }}
    >
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto no-scrollbar px-0"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 88px)',
          paddingTop: isWebDesktop ? '20px' : '0',
        }}
      >
        <StudioHeader title={title} subtitle={subtitle} />

        <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 pb-12">
          <div className="flex flex-col gap-4">
            {cards.map((card) => (
              <motion.button
                key={card.id}
                data-testid={`setup-card-${card.id}`}
                onClick={() => onSelectSubView(card.id)}
                whileTap={{ scale: 0.988 }}
                whileHover={{ y: -1 }}
                className="w-full text-left p-5 sm:p-6 transition-all duration-200 cursor-pointer relative overflow-hidden"
                style={{
                  borderRadius: 'var(--radius-card, 16px)',
                  backgroundColor: isLight
                    ? '#ffffff'
                    : isAmoled
                      ? '#000000'
                      : 'var(--surface-card-bg, var(--app-surface, #111115))',
                  border: '1px solid var(--track, var(--c-border))',
                  boxShadow:
                    'var(--surface-card-shadow, 0 8px 24px rgba(0, 0, 0, 0.16)), var(--surface-card-inset, inset 0 1px 1px rgba(255, 255, 255, 0.08))',
                }}
              >
                {/* Top Specular Rim */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 12,
                    right: 12,
                    height: '1px',
                    background: 'var(--surface-card-inset, rgba(255, 255, 255, 0.08))',
                    pointerEvents: 'none',
                    opacity: 0.6,
                  }}
                />

                {/* Top row: Icon container at upper-left & Chevron at upper-right */}
                <div className="flex items-center justify-between w-full">
                  <div
                    className="w-11 h-11 flex items-center justify-center"
                    style={{
                      borderRadius: 'var(--radius-compact, 12px)',
                      backgroundColor: isLight
                        ? 'rgba(0, 0, 0, 0.04)'
                        : 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--track, var(--c-border))',
                    }}
                  >
                    <span
                      className="material-symbols-outlined text-[22px]"
                      style={{
                        color: isLight ? 'var(--c-text-primary, #09090b)' : '#ffffff',
                      }}
                    >
                      {card.icon}
                    </span>
                  </div>
                  <span
                    className="material-symbols-outlined text-[22px]"
                    style={{
                      color: isLight ? '#a1a1aa' : 'var(--c-text-secondary, var(--muted))',
                    }}
                  >
                    chevron_right
                  </span>
                </div>

                {/* Middle row: Section Title & Muted Description */}
                <div className="mt-4 mb-4">
                  <h3
                    style={{
                      color: isLight
                        ? 'var(--c-text-primary, #09090b)'
                        : 'var(--c-text-primary, var(--text))',
                      fontFamily:
                        'var(--type-section-font, var(--studio-font-display, "Inter Tight", sans-serif))',
                      fontSize: 'var(--type-section-size, 19px)',
                      lineHeight: 'var(--type-section-lh, 24px)',
                      fontWeight: 'var(--type-section-weight, 600)' as any,
                      letterSpacing: 'var(--type-section-tracking, 0.6px)',
                      margin: 0,
                    }}
                  >
                    {card.title}
                  </h3>
                  <p
                    style={{
                      color: isLight
                        ? 'var(--c-text-secondary, #71717a)'
                        : 'var(--c-text-secondary, var(--muted))',
                      fontFamily:
                        'var(--type-body-font, var(--studio-font-body, "Inter", sans-serif))',
                      fontSize: 'var(--type-body-size, 14.5px)',
                      lineHeight: 'var(--type-body-lh, 18px)',
                      fontWeight: 'var(--type-body-weight, 400)' as any,
                      letterSpacing: 'var(--type-body-tracking, 0.3px)',
                      margin: '4px 0 0 0',
                    }}
                  >
                    {card.desc}
                  </p>
                </div>

                {/* Bottom row: Item Count / Status Badge */}
                <div className="flex items-center">
                  <span
                    className="inline-flex items-center px-3 py-1 text-xs"
                    style={{
                      borderRadius: 'var(--radius-compact, 12px)',
                      backgroundColor: isLight
                        ? 'rgba(0, 0, 0, 0.04)'
                        : 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid var(--track, var(--c-border))',
                      color: isLight
                        ? 'var(--c-text-secondary, #71717a)'
                        : 'var(--c-text-secondary, var(--muted))',
                      fontFamily:
                        'var(--type-meta-font, var(--studio-font-body, "Inter", sans-serif))',
                      fontSize: 'var(--type-meta-size, 12px)',
                      lineHeight: 'var(--type-meta-lh, 16px)',
                      fontWeight: 500,
                      letterSpacing: 'var(--type-meta-tracking, 0.2px)',
                    }}
                  >
                    {card.badge}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
