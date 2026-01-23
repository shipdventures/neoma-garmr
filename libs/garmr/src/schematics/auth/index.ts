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
  authentication: "cookie" | "bearer"
}

export function main(options: AuthSchematicOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const sharedTemplates = apply(url("./files/ts"), [
      template({
        ...strings,
        ...options,
      }),
      move(options.path),
    ])

    const authTemplates = apply(url(`./files/${options.authentication}`), [
      template({
        ...strings,
        ...options,
      }),
      move(options.path),
    ])

    return chain([mergeWith(sharedTemplates), mergeWith(authTemplates)])(
      tree,
      context,
    )
  }
}
