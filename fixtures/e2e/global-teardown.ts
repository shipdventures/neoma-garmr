import specsTeardown from "../specs/global-teardown"

export default async (): Promise<void> => {
  await specsTeardown()
}
