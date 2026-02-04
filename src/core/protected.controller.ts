import { RequiresAnyPermission, RequiresPermission } from "@neoma/garmr"
import { Controller, Get } from "@nestjs/common"

/**
 * A test Controller for testing permission-based authorization
 * using Garmr's RequiresPermission and RequiresAnyPermission decorators.
 */
@Controller("protected")
export class ProtectedController {
  /**
   * Requires read:articles permission.
   */
  @Get("articles")
  @RequiresPermission("read:articles")
  public getArticles(): { action: string } {
    return { action: "read:articles" }
  }

  /**
   * Requires both read:articles AND write:articles permissions.
   */
  @Get("articles/edit")
  @RequiresPermission("read:articles", "write:articles")
  public editArticles(): { action: string } {
    return { action: "edit:articles" }
  }

  /**
   * Requires either admin OR delete:articles permission.
   */
  @Get("articles/delete")
  @RequiresAnyPermission("admin", "delete:articles")
  public deleteArticles(): { action: string } {
    return { action: "delete:articles" }
  }

  /**
   * Requires read:reports AND (admin OR write:reports).
   * Tests combining both decorators on a single method.
   */
  @Get("reports")
  @RequiresPermission("read:reports")
  @RequiresAnyPermission("admin", "write:reports")
  public getReports(): { action: string } {
    return { action: "read:reports" }
  }
}

/**
 * A test Controller with class-level permission decorator.
 * All methods require read:admin permission.
 */
@Controller("admin")
@RequiresPermission("read:admin")
export class AdminController {
  @Get("dashboard")
  public getDashboard(): { action: string } {
    return { action: "admin:dashboard" }
  }

  @Get("settings")
  public getSettings(): { action: string } {
    return { action: "admin:settings" }
  }
}
