import type { ProjectRowData } from '@cs/components/projects/ProjectRow'

/**
 * What the Configs screen lists.
 *
 * A separate list from Compiler's, and separate on purpose rather than by
 * accident. The two modules are not two views of one thing: a project can sit
 * in both lists and mean something different in each, because opening it in
 * Compiler opens Compiler and opening it in Configs would open Configs. Orchid
 * Lab is the case that proves it — the same name is on both lists, and nothing
 * about Compiler's row decides what happens on this one.
 *
 * Nothing here opens yet. Configs had a blank window behind Orchid Lab for a
 * while; it was a placeholder for an editor that has not been designed, and it
 * was removed rather than left standing. Every row is pressable and inert until
 * there is something real to land in.
 *
 * So this file does not import Compiler's fixture and does not reuse its
 * `projectId`. That field means "the Compiler API holds this project", which is
 * a fact about Compiler and would be the wrong question to ask here.
 *
 * Like Compiler's, this is a fixture. Configs has no server yet — see
 * configs-back-end — and until it does there is nothing to read a list from.
 */
export type ConfigsProjectEntry = ProjectRowData

export const CONFIGS_PROJECTS: ConfigsProjectEntry[] = [
  {
    key: 'binary-main',
    name: 'Binary',
    branch: 'Main',
    monogram: 'B',
    monogramClass: 'text-cs-monogram-configs',
  },
  {
    key: 'myos-main',
    name: 'MyOS',
    branch: 'Main',
    monogram: 'M',
    monogramClass: 'text-cs-text-tertiary',
  },
  {
    key: 'orchid-lab-main',
    name: 'OrchidLab',
    branch: 'Main',
    monogram: 'O',
    monogramClass: 'text-cs-monogram-lab',
  },
]
