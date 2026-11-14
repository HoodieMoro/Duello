import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { Names, Result, Side } from '../lib/store';

export interface GameProps {
  /** chi inizia questa partita (si alterna a ogni rivincita) */
  starter: Side;
  names: Names;
  /** il gioco comunica a chi tocca, per evidenziarlo */
  onTurn: (side: Side) => void;
  /** da chiamare una sola volta, a partita finita */
  onEnd: (result: Result) => void;
}

/**
 * table = a turni, telefono in mezzo al tavolo (G2 in alto, scritte capovolte)
 * turns = a turni, stesso verso per tutti: ci si passa il telefono
 * live  = tempo reale, schermo diviso a metà, si gioca insieme
 */
export type GameMode = 'table' | 'turns' | 'live';

export type SectionId = 'live' | 'table' | 'carte' | 'parole' | 'turns';

export interface GameDef {
  id: string;
  name: string;
  tagline: string;
  rules: string[];
  mode: GameMode;
  icon: LucideIcon;
  /** sfumatura della tessera nel menu */
  tint: string;
  component: ComponentType<GameProps>;
  /** sezione del menu (se manca, quella della modalità) */
  section?: SectionId;
}
