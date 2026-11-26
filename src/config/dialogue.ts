import type { CommanderId } from './commanders';

export type PortraitId = 'mira' | 'holt' | 'ivo' | 'vesper' | 'sera' | 'rump' | 'xin' | 'pootin' | 'modhi' | 'khaboom' | 'kimfun' | 'mustard';

export interface DialogueLine {
  speaker: string;
  portrait: PortraitId;
  text: string;
  /** Shown only when this commander is the one in the field. */
  lead?: CommanderId;
  /** Shown only for that army. Shared lines omit this. */
  faction?: 'azure' | 'crimson' | 'frost';
}

export interface DialogueDef {
  id: string;
  lines: DialogueLine[];
}

/**
 * Liberation of the homeland. The gems are a seam of unknown energy.
 * Matching them is how an army draws on it. Cities are raised again after they fall.
 */
export const DIALOGUES: DialogueDef[] = [
  {
    id: 'depart',
    lines: [
      {
        lead: 'mira',
        speaker: 'Mira',
        portrait: 'mira',
        text: 'I will take the armor through the gate myself. Halden does not get another night of this.',
      },
      {
        lead: 'holt',
        speaker: 'Holt',
        portrait: 'holt',
        text: 'I will keep the line standing long enough to retake the gate. The wounded city is still ours to raise.',
      },
      {
        lead: 'ivo',
        speaker: 'Ivo',
        portrait: 'ivo',
        text: 'The seam under the gate still answers. I will feed it into the weapon and blow the occupation off our stones.',
      },
      {
        speaker: 'Mira',
        portrait: 'mira',
        text: 'Halden is the last free city, and it is already half rubble. The gem seams under it still answer to us.',
      },
      {
        speaker: 'Holt',
        portrait: 'holt',
        text: 'They hold every road past the gate. If the gate falls, the hospitals go dark with the rest.',
      },
      {
        speaker: 'Ivo',
        portrait: 'ivo',
        text: 'Matching the gems is not a trick. It is how this ground powers an army. Use it, or they will.',
      },
      {
        faction: 'azure',
        speaker: 'Mira',
        portrait: 'mira',
        text: 'The Coalition keeps the western shore. Their coil towers are already burning the far coast.',
      },
      {
        faction: 'azure',
        speaker: 'Holt',
        portrait: 'holt',
        text: 'Blue domes on our pads. Match the seam, and the prisms wake up.',
      },
      {
        faction: 'crimson',
        speaker: 'Mira',
        portrait: 'mira',
        text: 'The Directorate holds the eastern harbor. Their prisms are glaring on the western land.',
      },
      {
        faction: 'crimson',
        speaker: 'Ivo',
        portrait: 'ivo',
        text: 'Coil towers on the pads. We march until those domes go dark.',
      },
      {
        faction: 'azure',
        speaker: 'Rump',
        portrait: 'rump',
        text: 'Tremendous wall. Huge wall. Nobody builds bases better than me.',
      },
      {
        faction: 'crimson',
        speaker: 'Xin',
        portrait: 'xin',
        text: 'Have a little honey. The long plan is sweeter than a rush.',
      },
      {
        faction: 'frost',
        speaker: 'Pootin',
        portrait: 'pootin',
        text: 'Sit. The table has twelve more chairs. The bear is faster than the argument.',
      },
    ],
  },
  {
    id: 'gate-clear',
    lines: [
      {
        speaker: 'Holt',
        portrait: 'holt',
        text: 'The gate is ours. Halden is rubble, but it is ours. Barracks and a hospital can stand here again.',
      },
      {
        speaker: 'Mira',
        portrait: 'mira',
        text: 'Spend the funds at headquarters. Then take the convoy road, or the sealed seam cache if the coffers are thin.',
      },
      {
        speaker: 'Ivo',
        portrait: 'ivo',
        text: 'Their drills are already in the roots past the city. Veilwood is next, and they are stripping it.',
      },
    ],
  },
  {
    id: 'forest-enter',
    lines: [
      {
        speaker: 'Mira',
        portrait: 'mira',
        text: 'Veilwood splits. The west vein is slower. The east vein is where their patrols mass.',
      },
      {
        speaker: 'Holt',
        portrait: 'holt',
        text: 'Both roads end at Heartwood Spire. That is where they refine what they tore out of our ground.',
      },
      {
        speaker: 'Ivo',
        portrait: 'ivo',
        text: 'If the spire keeps burning the seam, every city behind us stays dark. We break it.',
      },
    ],
  },
  {
    id: 'heartwood',
    lines: [
      {
        speaker: 'Vesper',
        portrait: 'vesper',
        text: 'You are matching stones you barely understand, and calling it a war. This spire refines the seam. Leave it.',
      },
      {
        speaker: 'Mira',
        portrait: 'mira',
        text: 'The seam grew under our cities. It is not yours. Step out of the spire.',
      },
      {
        speaker: 'Ivo',
        portrait: 'ivo',
        text: 'You can refine it. You cannot own the ground it comes from.',
      },
    ],
  },
  {
    id: 'heartwood-clear',
    lines: [
      {
        speaker: 'Sera',
        portrait: 'sera',
        text: 'The spire guns are scrap. I am Sera Quill. Point me at the next city, and I will bring the battery.',
      },
      {
        speaker: 'Holt',
        portrait: 'holt',
        text: 'Their desert transmitters are still singing. Cinder Reach was cities before it was pits.',
      },
      {
        speaker: 'Mira',
        portrait: 'mira',
        text: 'Two cuts through the cinders. Hold one. Raise what we can on the way.',
      },
    ],
  },
  {
    id: 'dunes',
    lines: [
      {
        speaker: 'Holt',
        portrait: 'holt',
        text: 'Glass flats are open and watched. The quarry cut is where they buried the guns.',
      },
      {
        speaker: 'Ivo',
        portrait: 'ivo',
        text: 'A seam cache sits west of the flats. Funds, if we live to spend them on the towns they gutted.',
      },
      {
        speaker: 'Mira',
        portrait: 'mira',
        text: 'The factory at Cinder Gate can put a tank on the line before the first gem falls. Take the gate.',
      },
    ],
  },
  {
    id: 'coast',
    lines: [
      {
        speaker: 'Mira',
        portrait: 'mira',
        text: 'Glass Harbor. Their fleet sits on our docks and drinks the coastal seam dry.',
      },
      {
        speaker: 'Holt',
        portrait: 'holt',
        text: 'Black Dock still deals under the guns. A lower price is not freedom. It is ammunition for the rebuild.',
      },
      {
        speaker: 'Sera',
        portrait: 'sera',
        text: 'The harbor spire is the last well. After it, we stop marching and start raising walls.',
      },
    ],
  },
  {
    id: 'harbor',
    lines: [
      {
        speaker: 'Vesper',
        portrait: 'vesper',
        text: 'You walked every seam I seized. This harbor is the last well. Leave it, or drown for it.',
      },
      {
        speaker: 'Ivo',
        portrait: 'ivo',
        text: 'Then it is the last door. The gems stay in the ground. The cities stand over them.',
      },
      {
        speaker: 'Mira',
        portrait: 'mira',
        text: 'Holt. Sera. With me.',
      },
    ],
  },
  {
    id: 'harbor-clear',
    lines: [
      {
        speaker: 'Holt',
        portrait: 'holt',
        text: 'Flags on the cliff. The sea does not care who owns it. The people on the cliff do.',
      },
      {
        speaker: 'Sera',
        portrait: 'sera',
        text: 'The guns are quiet. Headquarters can finish the yards. I am not done standing watch.',
      },
      {
        speaker: 'Mira',
        portrait: 'mira',
        text: 'The gems stay in the ground they came from. Raise the cities. Hold the line.',
      },
    ],
  },
];

export function dialogueById(id: string): DialogueDef | undefined {
  return DIALOGUES.find((entry) => entry.id === id);
}

export function linesFor(id: string, commander: CommanderId, faction: 'azure' | 'crimson' | 'frost' = 'azure'): DialogueLine[] {
  const def = dialogueById(id);
  if (!def) return [];
  return def.lines.filter((line) => (!line.lead || line.lead === commander) && (!line.faction || line.faction === faction));
}
