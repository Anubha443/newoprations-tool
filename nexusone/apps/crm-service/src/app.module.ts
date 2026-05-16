import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrmModule } from './crm/crm.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'postgres',
      port: Number(process.env.POSTGRES_PORT || 5432),
      username: process.env.POSTGRES_USER || 'nexus',
      password: process.env.POSTGRES_PASSWORD || 'nexus',
      database: process.env.POSTGRES_DB || 'nexusone',
      schema: 'nexus_crm',
      autoLoadEntities: true,
      synchronize: false,
    }),
    CrmModule,
  ],
})
export class AppModule {}
