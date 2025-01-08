# @bunet/core
**Version**: 1.0.15

## Description
`@bunet/core` is an open-source library designed to build robust applications with the support of performance monitoring tools like OpenTelemetry. This library simplifies the integration, monitoring, and scaling of systems, ensuring efficiency and reliability for developers.

## Features
- **Easy Integration**: Supports popular tools such as OpenTelemetry and Sequelize.
- **Performance Monitoring**: Tracks metrics and traces to analyze system performance.
- **Modular Codebase**: Easy to maintain and extend.
- **TypeScript Support**: Ensures type safety and code clarity.
- **Comprehensive Testing Tools**: Includes test cases to ensure code quality.

## Dependency Injection
`@bunet/core` employs **Dependency Injection (DI)** to enhance flexibility and scalability. DI decouples the creation of system components, making the codebase easier to test and manage.

### Benefits of Dependency Injection
- **Improved Reusability**: Components are separated and easily reusable.
- **Enhanced Testability**: DI allows easy mocking of components during testing.
- **Reduced Tight Coupling**: Minimizes module dependencies, improving scalability.

### DI Approach in the Project
`@bunet/core` implements DI through the following steps:
1. **Register Services and Modules**: Services are declared and registered in a central container.
2. **Inject Dependencies During Initialization**: Services automatically receive their dependencies when used.

Example:
```typescript
// Declare and register services
import { DbContext, DbSet } from '@/bunet/core';
import { Options, Sequelize } from 'sequelize';
import { UserModel } from './Aggregates/UserAggregate/User';

export class AppDbContext extends DbContext {
  public Users: DbSet<UserModel> = new DbSet<UserModel>(UserModel.Definition(this.sequelize, 'User', 'Users'));

  constructor(options: Options) {
    super(options);
  }

  protected OnModelCreating(sequelize: Sequelize): void {
    this.sequelize.sync({ alter: true }).catch(console.error);
  }
}

export class UserService {
  @Inject() private context!: AppDbContext;

  async create(user: IUser): Promise<UserModel> {
    return this.context.Users.Create(user);
  }
}

// Initialize the container and register services
const builder = WebApplication.CreateBuilder();
const services = builder.Services;
services.AddControllers().AddDbContext(
  DbContext.OnConfiguring(AppDbContext, {
    dialect: 'postgres',
    host: 'localhost',
    port: 5433,
    username: 'postgres',
    password: 'postgres',
    database: 'postgres',
  })
);

// Use DI to inject dependencies
services.AddSingleton(UserService.name, UserService);
```
In this example, `UserService` automatically receives an instance of `AppDbContext` without needing to instantiate it directly. This simplifies dependency management and increases flexibility.

## Project Structure
```
├── global.d.ts        # TypeScript global definitions
├── package.json       # Project metadata and dependencies
├── tsconfig.json      # TypeScript configuration file
├── src/               # Source code of the project
├── test/              # Unit tests
```

## Installation
### System Requirements
- **Node.js**: Version >= 14.0.0
- **npm**: Version >= 6.0.0

### Install the Library
To install `@bunet/core`, run the following command:
```bash
npm install @bunet/core
```

## Usage
### Initializing the Library
```javascript
import 'global.d.ts';
import { WebApplication } from '@/bunet/core';

const builder = WebApplication.CreateBuilder();
const app = builder.Build(__dirname);
app.Run(3000);
```

### Integrating with OpenTelemetry
```javascript
import 'global.d.ts';
import { DbContext, WebApplication } from '@/bunet/core';
import { AppDbContext } from './Database/AppDbContext';
import { UserService } from './Services/UserService';

const builder = WebApplication.CreateBuilder();
const services = builder.Services;
services.AddOpenTelemetry({
  protocol: 'http',
  host: 'localhost',
  port: 80,
  systemMetricsInterval: 6000,
});

const app = builder.Build(__dirname);
app.Run(3000);
```

### Connecting to a Database with Sequelize
```typescript
export class AppDbContext extends DbContext {
  public Users: DbSet<UserModel> = new DbSet<UserModel>(UserModel.Definition(this.sequelize, 'User', 'Users'));

  constructor(options: Options) {
    super(options);
  }

  protected OnModelCreating(sequelize: Sequelize): void {
    this.sequelize.sync({ alter: true }).catch(console.error);
  }
}

export interface IUser {
  id: string;
  name: string;
  userName: string;
  password: string;
}

export interface IUserCreationAttributes extends Optional<IUser, 'id'> {}

export class UserModel extends Model<IUser, IUserCreationAttributes> {
  static Definition(sequelize: Sequelize, modelName: string, tableName: string): typeof UserModel {
    UserModel.init(
      {
        id: {
          type: DataTypes.STRING(32),
          defaultValue: (): string => {
            return uuidv7(true);
          },
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        userName: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        password: {
          type: DataTypes.STRING,
          allowNull: false,
        },
      },
      {
        sequelize,
        modelName,
        tableName,
        timestamps: true,
        hooks: {
          beforeCreate: (user) => {
            console.log(`Creating user`, user.get({ plain: true }));
          },
          afterCreate: (user) => {
            console.log(`User created`);
          },
        },
      }
    );
    return UserModel;
  }
}
```

## Testing
### Run All Tests
```bash
npm test
```

### Add New Test Cases
Test cases are located in the `test/` directory. Example:
```javascript
const assert = require('assert');

describe('Sample Test', () => {
  it('should return true', () => {
    assert.strictEqual(true, true);
  });
});
```

## Dependencies
This library uses the following dependencies:
- `@opentelemetry/api`: ^1.9.0
- `@opentelemetry/exporter-prometheus`: ^0.57.0
- `@opentelemetry/instrumentation-http`: ^0.57.0
- `@opentelemetry/sdk-metrics`: ^1.30.0
- `@opentelemetry/sdk-node`: ^0.57.0
- `@opentelemetry/sdk-trace-base`: ^1.30.0
- `@opentelemetry/sdk-trace-node`: ^1.30.0
- `pg`: ^8.13.1
- `reflect-metadata`: ^0.2.2
- `sequelize`: ^6.37.5

## Contributing
We welcome contributions from the community! To contribute:
1. Fork the repository.
2. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Commit your changes:
   ```bash
   git commit -m "Add a new feature"
   ```
4. Push your branch:
   ```bash
   git push origin feature/your-feature-name
   ```
5. Create a pull request.

## Author
**Fullname**: Dao Khoi Nguyen  
**Contact**: dknguyen@cmc.com.vn  
**LinkedIn**: [https://www.linkedin.com/in/khoinguyenict](https://www.linkedin.com/in/khoinguyenict)

## License
This project is licensed under the MIT License.