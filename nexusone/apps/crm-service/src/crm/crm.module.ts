import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Activity, Company, Contact, Deal, Email, Pipeline, PipelineStage } from './entities';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';

@Module({ imports: [TypeOrmModule.forFeature([Contact, Company, Deal, Pipeline, PipelineStage, Activity, Email])], controllers: [CrmController], providers: [CrmService] })
export class CrmModule {}
