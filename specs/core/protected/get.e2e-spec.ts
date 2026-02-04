import { faker } from "@faker-js/faker"
import { managedAppInstance } from "@neoma/managed-app"
import { HttpStatus } from "@nestjs/common"
import * as jwt from "jsonwebtoken"
import * as request from "supertest"
import { DataSource } from "typeorm"

const { OK, UNAUTHORIZED, FORBIDDEN } = HttpStatus
const SESSION_AUDIENCE = "session"

const UNAUTHORIZED_BODY = {
  statusCode: UNAUTHORIZED,
  message:
    "Unable to authenticate a principal. Please check the documentation for accepted authentication methods",
  error: "Unauthorized",
}

describe("GET /protected/*", () => {
  let app: Awaited<ReturnType<typeof managedAppInstance>>
  let datasource: DataSource

  beforeEach(async () => {
    app = await managedAppInstance("src/core/app.module.ts#AppModule")
    datasource = app.get(DataSource)
  })

  const createUserWithPermissions = async (
    permissions: string[],
  ): Promise<{ id: string; email: string; token: string }> => {
    const email = faker.internet.email().toLowerCase()
    const repo = datasource.getRepository("User")
    const user = repo.create({ email, permissions })
    await repo.save(user)

    const token = jwt.sign(
      { sub: (user as any).id, aud: SESSION_AUDIENCE },
      process.env.GARMR_SECRET!,
      { expiresIn: "1h" },
    )

    return { id: (user as any).id, email, token }
  }

  describe("Given a route /protected/articles requiring read:articles", () => {
    describe("When called without authentication", () => {
      it("should respond with HTTP 401", async () => {
        await request(app.getHttpServer())
          .get("/protected/articles")
          .expect(UNAUTHORIZED)
          .expect(UNAUTHORIZED_BODY)
      })
    })

    describe("When called with a user lacking read:articles permission", () => {
      it("should respond with HTTP 403", async () => {
        const { token } = await createUserWithPermissions(["write:articles"])

        await request(app.getHttpServer())
          .get("/protected/articles")
          .set("Authorization", `Bearer ${token}`)
          .expect(FORBIDDEN)
          .expect({
            statusCode: FORBIDDEN,
            message: "Permission denied: read:articles is required.",
            permission: "read:articles",
          })
      })
    })

    describe("When called with a user having empty permissions array", () => {
      it("should respond with HTTP 403", async () => {
        const { token } = await createUserWithPermissions([])

        await request(app.getHttpServer())
          .get("/protected/articles")
          .set("Authorization", `Bearer ${token}`)
          .expect(FORBIDDEN)
          .expect({
            statusCode: FORBIDDEN,
            message: "Permission denied: read:articles is required.",
            permission: "read:articles",
          })
      })
    })

    describe("When called with a user having read:articles permission", () => {
      it("should respond with HTTP 200", async () => {
        const { token } = await createUserWithPermissions(["read:articles"])

        await request(app.getHttpServer())
          .get("/protected/articles")
          .set("Authorization", `Bearer ${token}`)
          .expect(OK)
          .expect({ action: "read:articles" })
      })
    })

    describe("When called with a superuser (*)", () => {
      it("should respond with HTTP 200", async () => {
        const { token } = await createUserWithPermissions(["*"])

        await request(app.getHttpServer())
          .get("/protected/articles")
          .set("Authorization", `Bearer ${token}`)
          .expect(OK)
          .expect({ action: "read:articles" })
      })
    })

    describe("When called with wildcard *:articles", () => {
      it("should respond with HTTP 200", async () => {
        const { token } = await createUserWithPermissions(["*:articles"])

        await request(app.getHttpServer())
          .get("/protected/articles")
          .set("Authorization", `Bearer ${token}`)
          .expect(OK)
          .expect({ action: "read:articles" })
      })
    })

    describe("When called with wildcard read:*", () => {
      it("should respond with HTTP 200", async () => {
        const { token } = await createUserWithPermissions(["read:*"])

        await request(app.getHttpServer())
          .get("/protected/articles")
          .set("Authorization", `Bearer ${token}`)
          .expect(OK)
          .expect({ action: "read:articles" })
      })
    })
  })

  describe("Given a route /protected/articles/edit requiring read:articles AND write:articles", () => {
    describe("When called without authentication", () => {
      it("should respond with HTTP 401", async () => {
        await request(app.getHttpServer())
          .get("/protected/articles/edit")
          .expect(UNAUTHORIZED)
          .expect(UNAUTHORIZED_BODY)
      })
    })

    describe("When called with a user having only read:articles", () => {
      it("should respond with HTTP 403 for missing write:articles", async () => {
        const { token } = await createUserWithPermissions(["read:articles"])

        await request(app.getHttpServer())
          .get("/protected/articles/edit")
          .set("Authorization", `Bearer ${token}`)
          .expect(FORBIDDEN)
          .expect({
            statusCode: FORBIDDEN,
            message: "Permission denied: write:articles is required.",
            permission: "write:articles",
          })
      })
    })

    describe("When called with a user having only write:articles", () => {
      it("should respond with HTTP 403 for missing read:articles", async () => {
        const { token } = await createUserWithPermissions(["write:articles"])

        await request(app.getHttpServer())
          .get("/protected/articles/edit")
          .set("Authorization", `Bearer ${token}`)
          .expect(FORBIDDEN)
          .expect({
            statusCode: FORBIDDEN,
            message: "Permission denied: read:articles is required.",
            permission: "read:articles",
          })
      })
    })

    describe("When called with a user having both read:articles and write:articles", () => {
      it("should respond with HTTP 200", async () => {
        const { token } = await createUserWithPermissions([
          "read:articles",
          "write:articles",
        ])

        await request(app.getHttpServer())
          .get("/protected/articles/edit")
          .set("Authorization", `Bearer ${token}`)
          .expect(OK)
          .expect({ action: "edit:articles" })
      })
    })

    describe("When called with wildcard *:articles (covers both)", () => {
      it("should respond with HTTP 200", async () => {
        const { token } = await createUserWithPermissions(["*:articles"])

        await request(app.getHttpServer())
          .get("/protected/articles/edit")
          .set("Authorization", `Bearer ${token}`)
          .expect(OK)
          .expect({ action: "edit:articles" })
      })
    })

    describe("When called with a superuser (*)", () => {
      it("should respond with HTTP 200", async () => {
        const { token } = await createUserWithPermissions(["*"])

        await request(app.getHttpServer())
          .get("/protected/articles/edit")
          .set("Authorization", `Bearer ${token}`)
          .expect(OK)
          .expect({ action: "edit:articles" })
      })
    })

    describe("When called with partial wildcard read:* (missing write)", () => {
      it("should respond with HTTP 403 for missing write:articles", async () => {
        const { token } = await createUserWithPermissions(["read:*"])

        await request(app.getHttpServer())
          .get("/protected/articles/edit")
          .set("Authorization", `Bearer ${token}`)
          .expect(FORBIDDEN)
          .expect({
            statusCode: FORBIDDEN,
            message: "Permission denied: write:articles is required.",
            permission: "write:articles",
          })
      })
    })

    describe("When called with partial wildcard write:* (missing read)", () => {
      it("should respond with HTTP 403 for missing read:articles", async () => {
        const { token } = await createUserWithPermissions(["write:*"])

        await request(app.getHttpServer())
          .get("/protected/articles/edit")
          .set("Authorization", `Bearer ${token}`)
          .expect(FORBIDDEN)
          .expect({
            statusCode: FORBIDDEN,
            message: "Permission denied: read:articles is required.",
            permission: "read:articles",
          })
      })
    })
  })

  describe("Given a route /protected/articles/delete requiring admin OR delete:articles", () => {
    describe("When called without authentication", () => {
      it("should respond with HTTP 401", async () => {
        await request(app.getHttpServer())
          .get("/protected/articles/delete")
          .expect(UNAUTHORIZED)
          .expect(UNAUTHORIZED_BODY)
      })
    })

    describe("When called with a user having neither admin nor delete:articles", () => {
      it("should respond with HTTP 403", async () => {
        const { token } = await createUserWithPermissions(["read:articles"])

        await request(app.getHttpServer())
          .get("/protected/articles/delete")
          .set("Authorization", `Bearer ${token}`)
          .expect(FORBIDDEN)
          .expect({
            statusCode: FORBIDDEN,
            message: "Permission denied: admin | delete:articles is required.",
            permission: "admin | delete:articles",
          })
      })
    })

    describe("When called with a user having only admin", () => {
      it("should respond with HTTP 200", async () => {
        const { token } = await createUserWithPermissions(["admin"])

        await request(app.getHttpServer())
          .get("/protected/articles/delete")
          .set("Authorization", `Bearer ${token}`)
          .expect(OK)
          .expect({ action: "delete:articles" })
      })
    })

    describe("When called with a user having only delete:articles", () => {
      it("should respond with HTTP 200", async () => {
        const { token } = await createUserWithPermissions(["delete:articles"])

        await request(app.getHttpServer())
          .get("/protected/articles/delete")
          .set("Authorization", `Bearer ${token}`)
          .expect(OK)
          .expect({ action: "delete:articles" })
      })
    })

    describe("When called with a user having both admin and delete:articles", () => {
      it("should respond with HTTP 200", async () => {
        const { token } = await createUserWithPermissions([
          "admin",
          "delete:articles",
        ])

        await request(app.getHttpServer())
          .get("/protected/articles/delete")
          .set("Authorization", `Bearer ${token}`)
          .expect(OK)
          .expect({ action: "delete:articles" })
      })
    })

    describe("When called with a superuser (*)", () => {
      it("should respond with HTTP 200", async () => {
        const { token } = await createUserWithPermissions(["*"])

        await request(app.getHttpServer())
          .get("/protected/articles/delete")
          .set("Authorization", `Bearer ${token}`)
          .expect(OK)
          .expect({ action: "delete:articles" })
      })
    })

    describe("When called with wildcard *:articles (matches delete:articles)", () => {
      it("should respond with HTTP 200", async () => {
        const { token } = await createUserWithPermissions(["*:articles"])

        await request(app.getHttpServer())
          .get("/protected/articles/delete")
          .set("Authorization", `Bearer ${token}`)
          .expect(OK)
          .expect({ action: "delete:articles" })
      })
    })

    describe("When called with wildcard delete:* (matches delete:articles)", () => {
      it("should respond with HTTP 200", async () => {
        const { token } = await createUserWithPermissions(["delete:*"])

        await request(app.getHttpServer())
          .get("/protected/articles/delete")
          .set("Authorization", `Bearer ${token}`)
          .expect(OK)
          .expect({ action: "delete:articles" })
      })
    })

    describe("When called with empty permissions array", () => {
      it("should respond with HTTP 403", async () => {
        const { token } = await createUserWithPermissions([])

        await request(app.getHttpServer())
          .get("/protected/articles/delete")
          .set("Authorization", `Bearer ${token}`)
          .expect(FORBIDDEN)
          .expect({
            statusCode: FORBIDDEN,
            message: "Permission denied: admin | delete:articles is required.",
            permission: "admin | delete:articles",
          })
      })
    })
  })

  describe("Given a route /protected/reports requiring read:reports AND (admin OR write:reports) [Advanced: combined decorators]", () => {
    describe("When called without authentication", () => {
      it("should respond with HTTP 401", async () => {
        await request(app.getHttpServer())
          .get("/protected/reports")
          .expect(UNAUTHORIZED)
          .expect(UNAUTHORIZED_BODY)
      })
    })

    describe("When called with only read:reports (missing OR requirement)", () => {
      it("should respond with HTTP 403", async () => {
        const { token } = await createUserWithPermissions(["read:reports"])

        await request(app.getHttpServer())
          .get("/protected/reports")
          .set("Authorization", `Bearer ${token}`)
          .expect(FORBIDDEN)
          .expect({
            statusCode: FORBIDDEN,
            message: "Permission denied: admin | write:reports is required.",
            permission: "admin | write:reports",
          })
      })
    })

    describe("When called with only admin (missing AND requirement)", () => {
      it("should respond with HTTP 403", async () => {
        const { token } = await createUserWithPermissions(["admin"])

        await request(app.getHttpServer())
          .get("/protected/reports")
          .set("Authorization", `Bearer ${token}`)
          .expect(FORBIDDEN)
          .expect({
            statusCode: FORBIDDEN,
            message: "Permission denied: read:reports is required.",
            permission: "read:reports",
          })
      })
    })

    describe("When called with read:reports AND admin", () => {
      it("should respond with HTTP 200", async () => {
        const { token } = await createUserWithPermissions([
          "read:reports",
          "admin",
        ])

        await request(app.getHttpServer())
          .get("/protected/reports")
          .set("Authorization", `Bearer ${token}`)
          .expect(OK)
          .expect({ action: "read:reports" })
      })
    })

    describe("When called with read:reports AND write:reports", () => {
      it("should respond with HTTP 200", async () => {
        const { token } = await createUserWithPermissions([
          "read:reports",
          "write:reports",
        ])

        await request(app.getHttpServer())
          .get("/protected/reports")
          .set("Authorization", `Bearer ${token}`)
          .expect(OK)
          .expect({ action: "read:reports" })
      })
    })
  })

  describe("Given a controller /admin/* with class-level @RequiresPermission('read:admin')", () => {
    describe("When called without authentication", () => {
      it("should respond with HTTP 401 for /admin/dashboard", async () => {
        await request(app.getHttpServer())
          .get("/admin/dashboard")
          .expect(UNAUTHORIZED)
          .expect(UNAUTHORIZED_BODY)
      })

      it("should respond with HTTP 401 for /admin/settings", async () => {
        await request(app.getHttpServer())
          .get("/admin/settings")
          .expect(UNAUTHORIZED)
          .expect(UNAUTHORIZED_BODY)
      })
    })

    describe("When called without read:admin permission", () => {
      it("should respond with HTTP 403 for /admin/dashboard", async () => {
        const { token } = await createUserWithPermissions(["read:articles"])

        await request(app.getHttpServer())
          .get("/admin/dashboard")
          .set("Authorization", `Bearer ${token}`)
          .expect(FORBIDDEN)
          .expect({
            statusCode: FORBIDDEN,
            message: "Permission denied: read:admin is required.",
            permission: "read:admin",
          })
      })

      it("should respond with HTTP 403 for /admin/settings", async () => {
        const { token } = await createUserWithPermissions(["read:articles"])

        await request(app.getHttpServer())
          .get("/admin/settings")
          .set("Authorization", `Bearer ${token}`)
          .expect(FORBIDDEN)
          .expect({
            statusCode: FORBIDDEN,
            message: "Permission denied: read:admin is required.",
            permission: "read:admin",
          })
      })
    })

    describe("When called with read:admin permission", () => {
      it("should respond with HTTP 200 for /admin/dashboard", async () => {
        const { token } = await createUserWithPermissions(["read:admin"])

        await request(app.getHttpServer())
          .get("/admin/dashboard")
          .set("Authorization", `Bearer ${token}`)
          .expect(OK)
          .expect({ action: "admin:dashboard" })
      })

      it("should respond with HTTP 200 for /admin/settings", async () => {
        const { token } = await createUserWithPermissions(["read:admin"])

        await request(app.getHttpServer())
          .get("/admin/settings")
          .set("Authorization", `Bearer ${token}`)
          .expect(OK)
          .expect({ action: "admin:settings" })
      })
    })

    describe("When called with superuser (*)", () => {
      it("should respond with HTTP 200 for both endpoints", async () => {
        const { token } = await createUserWithPermissions(["*"])

        await request(app.getHttpServer())
          .get("/admin/dashboard")
          .set("Authorization", `Bearer ${token}`)
          .expect(OK)
          .expect({ action: "admin:dashboard" })

        await request(app.getHttpServer())
          .get("/admin/settings")
          .set("Authorization", `Bearer ${token}`)
          .expect(OK)
          .expect({ action: "admin:settings" })
      })
    })
  })
})
