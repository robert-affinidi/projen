import { join } from 'path';
import { readFile, writeFile } from 'fs-extra';
import * as logging from '../logging';
import * as utils from '../util';

export interface UpdateChangelogOptions {
  /**
   * Path to input changelog entry file.
   *
   * Relative to cwd.
   *
   * @example dist/changelog.md
   */
  inputChangelog: string;

  /**
   * Path to project-level changelog.
   *
   * The contents of inputChangelog will be prepended onto
   * this changelog.
   *
   * Relative to cwd
   *
   * @example changelog.md
   */
  outputChangelog: string;

  /**
   * Release version.
   */
  releaseTagFile: string;
}

/**
 * Prepends input changelog entry onto project-level changelog.
 *
 * Currently assumes a headerless changelog formatted according to
 * [conventional-changelog](https://github.com/conventional-changelog/conventional-changelog)
 * rules.
 *
 * @param cwd working directory (git repository)
 * @param options options
 */
export async function updateChangelog(
  cwd: string,
  options: UpdateChangelogOptions,
) {
  const inputChangelog = join(cwd, options.inputChangelog);
  const outputChangelog = join(cwd, options.outputChangelog);
  const releaseTagFile = join(cwd, options.releaseTagFile);


  let releaseTag = (await utils.tryReadFile(releaseTagFile)).trim();

  if (!releaseTag) {
    throw new Error(
      `Unable to determine version from ${releaseTagFile}. Cannot proceed with changelog update. Did you run 'bump'?`,
    );
  }

  const inputChangelogContent = await readFile(inputChangelog, 'utf-8');
  const changelogVersionSearchPattern = `[${releaseTag}]`;

  if (!inputChangelogContent.includes(changelogVersionSearchPattern)) {
    throw new Error(
      `Supplied version ${releaseTag} was not found in input changelog. You may want to check it's content.`,
    );
  }

  const outputChangelogContent = await readFile(outputChangelog, 'utf-8');

  if (outputChangelogContent.indexOf(changelogVersionSearchPattern) > -1) {
    logging.info(
      `Changelog already contains an entry for ${releaseTag}. Skipping changelog update.`,
    );
    return;
  }

  const newChangelog = inputChangelogContent.trimEnd() + '\n\n' + outputChangelogContent.trimStart();

  await writeFile(
    outputChangelog,
    newChangelog,
  );

  utils.exec(`git add ${outputChangelog} && git commit -m "chore(release): ${releaseTag}"`, { cwd });
}