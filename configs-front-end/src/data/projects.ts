import type { ProjectRowData } from '@cs/components/projects/ProjectRow'

/**
 * What the Configs screen lists.
 *
 * A separate list from Compiler's, and separate on purpose rather than by
 * accident. The two modules are not two views of one thing: a project can sit
 * in both lists and mean something different in each, because opening it in
 * Compiler opens Compiler and opening it in Configs opens Configs. Orchid Lab
 * is the case that proves it — the same name appears on both frames, opens in
 * one and not the other, and nothing about Compiler's row should decide what
 * happens on this one.
 *
 * So this file does not import Compiler's fixture and does not reuse its
 * `projectId`. That field means "the Compiler API holds this project", which is
 * a fact about Compiler and would be the wrong question to ask here.
 *
 * Like Compiler's, this is a fixture. Configs has no server yet — see
 * configs-back-end — and until it does there is nothing to read a list from.
 */
export interface ConfigsProjectEntry extends ProjectRowData {
  /**
   * Whether Configs can open this project. Only Configs itself, for now: the
   * other two rows are drawn because the design draws them, and they wait for
   * Configs to be able to do anything with a project that is not its own.
   */
  opens?: boolean
}

export const CONFIGS_PROJECTS: ConfigsProjectEntry[] = [
  {
    key: 'configs-main',
    name: 'Configs',
    branch: 'Main',
    monogram: 'C',
    monogramClass: 'text-cs-monogram-configs',
    opens: true,
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
