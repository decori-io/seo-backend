import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { WebsiteProfilesService } from './website-profiles.service';
import { WebsiteProfile, WebsiteProfileSchema } from './schemas/website-profile.schema';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Connection } from 'mongoose';
import { UsersService } from '../users/users.service';
import { User, UserSchema, UserDocument } from '../users/schemas/user.schema';

describe('WebsiteProfilesService', () => {
  let websiteProfileService: WebsiteProfilesService;
  let userService: UsersService;
  let mongod: MongoMemoryServer;
  let connection: Connection;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([
          { name: WebsiteProfile.name, schema: WebsiteProfileSchema },
          { name: User.name, schema: UserSchema },
        ]),
      ],
      providers: [WebsiteProfilesService, UsersService],
    }).compile();

    websiteProfileService = module.get<WebsiteProfilesService>(WebsiteProfilesService);
    userService = module.get<UsersService>(UsersService);
    connection = mongoose.connection;
  });

  afterAll(async () => {
    await connection.close();
    await mongod.stop();
  });

  it('should create a website profile with a valid userId and domain', async () => {
    // First, create a user
    const user = await userService.create({ email: 'profileuser@example.com' }) as UserDocument;
    expect(user).toBeDefined();
    // Now, create a website profile
    const domain = 'https://socialwolvez.com';
    const profile = await websiteProfileService.create({ domain, userId: user._id.toString() });
    expect(profile).toBeDefined();
    expect(profile.domain).toBe(domain);
    expect(profile.userId.toString()).toBe(user._id.toString());
    expect(profile._id).toBeDefined();
  });
});
