import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree, readProjectConfiguration } from '@nx/devkit';

import { setupProjectNonViteGenerator } from './generator';
import { SetupProjectNonViteGeneratorSchema } from './schema';

describe('setup-project-non-vite generator', () => {
  let tree: Tree;
  const options: SetupProjectNonViteGeneratorSchema = { name: 'test' };

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should run successfully', async () => {
    await setupProjectNonViteGenerator(tree, options);
    const config = readProjectConfiguration(tree, 'test');
    expect(config).toBeDefined();
  });
});
