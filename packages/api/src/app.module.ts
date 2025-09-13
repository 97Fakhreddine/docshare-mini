import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { envValidation } from './config/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './core/guards/jwt.guard';
import { DocumentsModule } from './modules/documents/documents.module';
import { SharesModule } from './modules/shares/shares.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidation }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        uri: cfg.getOrThrow<string>('MONGODB_URI'),
        // If you want to override the db in the URI:
        // dbName: cfg.get<string>('MONGODB_DB'),
        serverSelectionTimeoutMS: 10_000,
        autoIndex: true,
        // Helpful in dev:
        // connectionFactory: (connection) => {
        //   Logger.log(`Mongo connected: ${connection.name}`, 'Mongoose');
        //   return connection;
        // },
      }),
    }),
    AuthModule,
    DocumentsModule,
    SharesModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {
  private readonly logger = new Logger(AppModule.name);

  constructor(config: ConfigService) {
    const masked = config
      .get('MONGODB_URI')
      ?.replace(/\/\/(.*)@/, '//***:***@');
    this.logger.log(`MONGODB_URI=${masked}`);
  }
}
