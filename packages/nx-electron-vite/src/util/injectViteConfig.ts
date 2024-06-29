import * as ts from "typescript";
import { Tree } from "@nx/devkit";

export function injectViteConfig(pathToConfig: string, tree: Tree) {
  // Read the existing Vite configuration file
  const content = tree.read(pathToConfig)?.toString() || '';
  let sourceFile = ts.createSourceFile(
    pathToConfig,
    content,
    ts.ScriptTarget.Latest,
    true
  );

  // Identify the default export node
  let defaultExportNode: ts.ExportAssignment | undefined;
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isExportAssignment(node)) {
      defaultExportNode = node;
    }
  });

  if (!defaultExportNode) {
    throw new Error("No default export found in the Vite config");
  }

  // Check if the export is a `defineConfig` call expression
  if (
    ts.isCallExpression(defaultExportNode.expression) &&
    ts.isIdentifier(defaultExportNode.expression.expression) &&
    defaultExportNode.expression.expression.escapedText === "defineConfig"
  ) {
    const configObject = defaultExportNode.expression
      .arguments[0] as ts.ObjectLiteralExpression;

    // Find the `plugins` property in the configuration object
    const pluginsProperty = configObject.properties.find((property) => {
      return (
        ts.isPropertyAssignment(property) &&
        ts.isIdentifier(property.name) &&
        property.name.escapedText === "plugins"
      );
    }) as ts.PropertyAssignment | undefined;

    if (
      pluginsProperty &&
      ts.isArrayLiteralExpression(pluginsProperty.initializer)
    ) {
      // Create a call expression for `electronNxViteConfig()`
      const electronNxViteConfigCall = ts.factory.createCallExpression(
        ts.factory.createIdentifier("electronNxViteConfig"),
        undefined,
        []
      );

      // Add the `electronNxViteConfig()` call to the start of the plugins array
      const updatedPluginsArray = ts.factory.updateArrayLiteralExpression(
        pluginsProperty.initializer,
        [electronNxViteConfigCall, ...pluginsProperty.initializer.elements]
      );

      // Update the plugins property
      const updatedPluginsProperty = ts.factory.updatePropertyAssignment(
        pluginsProperty,
        pluginsProperty.name,
        updatedPluginsArray
      );

      // Update the configuration object
      const updatedConfigObject = ts.factory.updateObjectLiteralExpression(
        configObject,
        configObject.properties.map((prop) =>
          prop === pluginsProperty ? updatedPluginsProperty : prop
        )
      );

      // Update the default export assignment
      const updatedExportNode = ts.factory.updateExportAssignment(
        defaultExportNode,
        defaultExportNode.modifiers,
        ts.factory.updateCallExpression(
          defaultExportNode.expression,
          defaultExportNode.expression.expression,
          defaultExportNode.expression.typeArguments,
          [updatedConfigObject]
        )
      );

      // Create the import declaration `import electronNxViteConfig from './electron-nx-vite.config';`
      const electronImport = ts.factory.createImportDeclaration(
        undefined,
        ts.factory.createImportClause(
          false,
          ts.factory.createIdentifier("electronNxViteConfig"),
          undefined
        ),
        ts.factory.createStringLiteral("./electron-nx-vite.config")
      );

      // Place the new import after the first line (e.g., after the reference directive)
      const updatedStatements = [
        sourceFile.statements[0], // Retain the first statement (reference directive)
        electronImport, // Add the new import statement
        ...sourceFile.statements.slice(1).map((statement) =>
          statement === defaultExportNode ? updatedExportNode : statement
        )
      ];

      // Update the source file with the new import statement
      sourceFile = ts.factory.updateSourceFile(sourceFile, updatedStatements);

      // Print the modified code
      const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
      const modifiedCode = printer.printNode(
        ts.EmitHint.Unspecified,
        sourceFile,
        sourceFile
      );

      const linted = modifiedCode.replace(
        "export default",
        "\nexport default"
      );

      return linted;

    } else {
      throw new Error(
        'Unable to find the "plugins" property or it is not an array in the Vite configuration file.'
      );
    }
  } else {
    throw new Error(
      "The default export is not a call expression with defineConfig function."
    );
  }
}
