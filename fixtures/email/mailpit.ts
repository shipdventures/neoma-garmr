/**
 * A simple Mailpit API client for use in tests.
 */
export const mailpit = {
  /**
   * Clears all emails from Mailpit.
   *
   * Call this to clean up before or after tests.
   *
   * @returns A promise that resolves when the operation is complete.
   */
  clear: async (): Promise<void> => {
    await fetch(`${process.env.MAILPIT_API}/messages`, { method: "DELETE" })
    return
  },
  /**
   * Retrieves all emails from Mailpit.
   *
   * @returns A promise that resolves to the list of emails as JSON.
   */
  messages: async (): Promise<any> => {
    const res = await fetch(`${process.env.MAILPIT_API}/messages`)
    return res.json()
  },
  /**
   * Retrieves a specific email by ID from Mailpit.
   *
   * @param id - The ID of the email to retrieve.
   * @returns A promise that resolves to the email details as JSON.
   */
  message: async (id: string): Promise<any> => {
    const res = await fetch(`${process.env.MAILPIT_API}/message/${id}`)
    return res.json()
  },
}
