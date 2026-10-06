import { template } from "@babel/core";
import type { types as t } from "@babel/core";
import { declare } from "@babel/helper-plugin-utils";
import convertFunctionParams from "./params.ts";
import convertFunctionRest from "./rest.ts";
export { convertFunctionParams };

export interface Options {
  /** @deprecated Use the `ignoreFunctionLength` assumption instead. */
  loose?: boolean;
}

export default declare((api, options: Options) => {
  api.assertVersion(REQUIRED_VERSION("^7.0.0-0 || ^8.0.0"));

  if ("loose" in options) {
    console.warn(
      "@babel/plugin-transform-parameters: The 'loose' option has been deprecated, " +
        "use the `ignoreFunctionLength` assumption instead (https://babeljs.io/assumptions).",
    );
  }

  const ignoreFunctionLength =
    api.assumption("ignoreFunctionLength") ?? options.loose;
  // Todo(BABEL 8): Consider default it to false
  const noNewArrows = api.assumption("noNewArrows") ?? true;

  return {
    name: "transform-parameters",

    visitor: {
      Function(path) {
        if (
          path.isArrowFunctionExpression() &&
          path
            .get("params")
            .some(param => param.isRestElement() || param.isAssignmentPattern())
        ) {
          // default/rest visitors require access to `arguments`, so it cannot be an arrow
          path.arrowFunctionToExpression({
            allowInsertArrowWithRest: false,
            noNewArrows,
          });

          // In some cases arrowFunctionToExpression replaces the function with a wrapper.
          // Return early; the wrapped function will be visited later in the AST traversal.
          if (!path.isFunctionExpression()) return;
        }

        let asyncBodyWrapped = false;
        const convertedRest = convertFunctionRest(path, () => {
          asyncBodyWrapped = true;
        });
        const convertedParams = convertFunctionParams(
          path,
          ignoreFunctionLength,
        );

        if (asyncBodyWrapped) {
          // Finalize after both passes so all parameter initialization rejects.
          path.node.body = template.statement.ast`{
            try {
              ${(path.node.body as t.BlockStatement).body}
            } catch (e) {
              return Promise.reject(e);
            }
          }` as t.BlockStatement;
        }

        if (convertedRest || convertedParams) {
          // Manually reprocess this scope to ensure that the moved params are updated.
          path.scope.crawl();
        }
      },
    },
  };
});
