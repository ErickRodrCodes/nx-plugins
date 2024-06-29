import { BuildElectronExecutorSchema } from './schema';
import executor from './executor';
import { ExecutorContext } from '@nx/devkit';

const options: BuildElectronExecutorSchema = {
  hostProject: 'hostProject',
  hostProjectRoot: 'hostProjectRoot',
  mainOutputFilename: 'mainOutputFilename',
  mainOutputPath: 'mainOutputPath'
};
const context: ExecutorContext = {} as ExecutorContext

describe('BuildElectron Executor', () => {
  it('can run', async () => {
    const output = await executor(options,context);
    expect(output.success).toBe(true);
  });
});
