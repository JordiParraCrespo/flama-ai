import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
  Version,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { CheckPolicies } from "../auth/decorators/check-policies.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { PoliciesGuard } from "../auth/guards/policies.guard";
import { UserResponseDto } from "./dtos/user-response.dto";
import { FindUsersRequest } from "./requests/find-users.request";
import { UpdateUserRequest } from "./requests/update-user.request";
import { DeleteUserService } from "./services/delete-user.service";
import { UpdateUserService } from "./services/update-user.service";
import { UsersService } from "./services/users.service";
import { UserMapper } from "./user.mapper";

@ApiTags("Users")
@ApiBearerAuth()
@UseGuards(AuthGuard, PoliciesGuard)
@Controller("users")
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly updateUserService: UpdateUserService,
    private readonly deleteUserService: DeleteUserService,
    private readonly userMapper: UserMapper,
  ) {}

  @Get()
  @Version("1")
  @CheckPolicies({ action: "read", subject: "User" })
  @ApiOperation({ summary: "List all users" })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "Page number (default: 1)",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Items per page (default: 20, max: 100)",
  })
  @ApiQuery({
    name: "role",
    required: false,
    enum: ["admin", "user"],
    description: "Filter by role",
  })
  @ApiQuery({
    name: "search",
    required: false,
    type: String,
    description: "Search by name or email",
  })
  @ApiResponse({ status: 200 })
  async findAll(@Query() query: FindUsersRequest) {
    const result = await this.usersService.findAll(query);
    return {
      data: result.data.map((user) =>
        this.userMapper.toController(this.userMapper.toService(user)),
      ),
      meta: result.meta,
    };
  }

  @Get("me")
  @Version("1")
  @ApiOperation({ summary: "Get current user profile" })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async me(@CurrentUser("id") userId: string) {
    const user = await this.usersService.findById(userId);
    return this.userMapper.toController(this.userMapper.toService(user));
  }

  @Get(":id")
  @Version("1")
  @CheckPolicies({ action: "read", subject: "User" })
  @ApiOperation({ summary: "Get user by ID" })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 404, description: "USER_001: User not found" })
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    const user = await this.usersService.findById(id);
    return this.userMapper.toController(this.userMapper.toService(user));
  }

  @Patch(":id")
  @Version("1")
  @CheckPolicies({ action: "update", subject: "User" })
  @ApiOperation({ summary: "Update user" })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 404, description: "USER_001: User not found" })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRequest,
  ) {
    const user = await this.updateUserService.execute(id, dto);
    return this.userMapper.toController(this.userMapper.toService(user));
  }

  @Delete(":id")
  @Version("1")
  @CheckPolicies({ action: "delete", subject: "User" })
  @ApiOperation({ summary: "Delete user" })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: "USER_001: User not found" })
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.deleteUserService.execute(id);
  }
}
