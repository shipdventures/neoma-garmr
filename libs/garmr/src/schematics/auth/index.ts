import { join } from "path"

import { strings } from "@angular-devkit/core"
import {
  Rule,
  SchematicContext,
  Tree,
  apply,
  url,
  template,
  move,
  chain,
  mergeWith,
} from "@angular-devkit/schematics"

interface AuthSchematicOptions {
  path: string
  mode: "api" | "html"
}

export function main(options: AuthSchematicOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const templateSource = apply(url("./files/ts"), [
      template({
        ...strings,
        ...options,
      }),
      move(join(options.path, "auth")),
    ])

    return chain([mergeWith(templateSource)])(tree, context)
  }
}
