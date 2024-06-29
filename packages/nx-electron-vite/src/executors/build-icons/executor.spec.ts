import { BuildIconsExecutorSchema } from './schema';
import executor from './executor';

const options: BuildIconsExecutorSchema = {};

describe('BuildIcons Executor', () => {
  it('can run', async () => {
    const output = await executor(options);
    expect(output.success).toBe(true);
  });
});
