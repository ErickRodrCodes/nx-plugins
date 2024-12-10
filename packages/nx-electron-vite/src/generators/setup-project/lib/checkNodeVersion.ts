import { compareNodeVersion } from '../../../util/utils';

/**
 * Validates the `type` field in the project's package.json.
 *
 * @param rootProject - The project to validate.
 * @param tree - Represents the file system.
 * @throws Error if `type` is not 'module'.
 */
export const checkNodeVersion = (
  currentVersion: string,
  suggestedNodeVersion: string
) => {
  if (compareNodeVersion(currentVersion, suggestedNodeVersion) === -1) {
    throw new Error(
      `Your current node version ${currentVersion} is lower than the suggested version ${suggestedNodeVersion}. Please update your node version to ${suggestedNodeVersion} or higher.`
    );
  }
};
