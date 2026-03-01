import { describe, it, expect } from "vitest"
import {
  apiError,
  unauthorized,
  badRequest,
  validationError,
  internalError,
  API_ERROR_CODES,
} from "./api-error"

describe("api-error", () => {
  it("unauthorized returns 401 and correct body shape", async () => {
    const res = unauthorized()
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toEqual({
      error: { code: API_ERROR_CODES.UNAUTHORIZED, message: "Unauthorized" },
    })
  })

  it("badRequest returns 400 and message", async () => {
    const res = badRequest("Invalid input", { field: "week" })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe(API_ERROR_CODES.BAD_REQUEST)
    expect(body.error.message).toBe("Invalid input")
    expect(body.error.details).toEqual({ field: "week" })
  })

  it("validationError returns 422", async () => {
    const res = validationError("Validation failed")
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error.code).toBe(API_ERROR_CODES.VALIDATION_ERROR)
  })

  it("internalError returns 500 and hides details in production", async () => {
    const orig = process.env.NODE_ENV
    process.env.NODE_ENV = "production"
    const res = internalError("Server error", { stack: "x" })
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.error.details).toBeUndefined()
    process.env.NODE_ENV = orig
  })

  it("apiError with custom status overrides default", async () => {
    const res = apiError(API_ERROR_CODES.BAD_REQUEST, "Custom", { status: 400 })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.message).toBe("Custom")
  })
})
