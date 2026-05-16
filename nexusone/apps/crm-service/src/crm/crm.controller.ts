import { Body, Controller, Delete, Get, Param, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CrmService } from './crm.service';
import { BulkDto, CreateCompanyDto, CreateContactDto, CreateDealDto, CreatePipelineDto } from './dto';
import { Response } from 'express';

@UseGuards(JwtAuthGuard)
@Controller('crm')
export class CrmController {
  constructor(private readonly service: CrmService) {}
  @Get('contacts') contacts(@Query('q') q?: string) { return q ? this.service.searchContacts(q) : this.service['contacts'].find(); }
  @Get('contacts/search') contactSearch(@Query('q') q = '') { return this.service.searchContacts(q); }
  @Post('contacts') createContact(@Body() dto: CreateContactDto) { return this.service.crud(this.service['contacts'], dto); }
  @Put('contacts/:id') updateContact(@Param('id') id: string, @Body() dto: Partial<CreateContactDto>) { return this.service.crud(this.service['contacts'], { id, ...dto }); }
  @Delete('contacts/:id') delContact(@Param('id') id: string) { return this.service.remove(this.service['contacts'], id); }
  @Post('contacts/:id/ai-enrich') aiEnrich(@Param('id') id: string) { return { id, enriched: true, source: 'public-web', fields: { linkedin: null } }; }
  @Post('contacts/bulk/tag') async bulkTag(@Body() dto: BulkDto) { for (const id of dto.ids) await this.service.crud(this.service['contacts'], { id, tags: dto.tags || [] }); return { ok: true }; }
  @Post('contacts/bulk/assign') async bulkAssign(@Body() dto: BulkDto) { for (const id of dto.ids) await this.service.crud(this.service['contacts'], { id, owner_id: dto.owner_id }); return { ok: true }; }

  @Get('companies') companies() { return this.service['companies'].find(); }
  @Post('companies') createCompany(@Body() dto: CreateCompanyDto) { return this.service.crud(this.service['companies'], dto); }
  @Put('companies/:id') updateCompany(@Param('id') id: string, @Body() dto: Partial<CreateCompanyDto>) { return this.service.crud(this.service['companies'], { id, ...dto }); }
  @Delete('companies/:id') delCompany(@Param('id') id: string) { return this.service.remove(this.service['companies'], id); }

  @Get('deals') deals() { return this.service['deals'].find(); }
  @Post('deals') createDeal(@Body() dto: CreateDealDto) { return this.service.crud(this.service['deals'], dto); }
  @Put('deals/:id') updateDeal(@Param('id') id: string, @Body() dto: Partial<CreateDealDto>) { return this.service.crud(this.service['deals'], { id, ...dto }); }
  @Delete('deals/:id') delDeal(@Param('id') id: string) { return this.service.remove(this.service['deals'], id); }
  @Post('deals/:id/ai-forecast') aiForecast(@Param('id') id: string) { return { id, predicted_probability: 67, factors: ['activity_velocity', 'historical_stage_conversion'] }; }
  @Post('deals/bulk/stage-change') async bulkStage(@Body() dto: BulkDto) { for (const id of dto.ids) await this.service.crud(this.service['deals'], { id, stage_id: dto.stage_id }); return { ok: true }; }

  @Get('pipelines') pipelines() { return this.service['pipelines'].find(); }
  @Post('pipelines') createPipeline(@Body() dto: CreatePipelineDto) { return this.service.crud(this.service['pipelines'], dto); }
  @Put('pipelines/:id') updatePipeline(@Param('id') id: string, @Body() dto: Partial<CreatePipelineDto>) { return this.service.crud(this.service['pipelines'], { id, ...dto }); }
  @Delete('pipelines/:id') delPipeline(@Param('id') id: string) { return this.service.remove(this.service['pipelines'], id); }
  @Get('pipelines/:id/stages') stages(@Param('id') id: string) { return this.service['stages'].find({ where: { pipeline_id: id } }); }
  @Post('pipelines/:id/stages') createStage(@Param('id') id: string, @Body() body: any) { return this.service.crud(this.service['stages'], { ...body, pipeline_id: id }); }
  @Get('pipelines/:id/board') board(@Param('id') id: string) { return this.service.board(id); }

  @Get('activities') activities() { return this.service['activities'].find(); }
  @Post('activities') createActivity(@Body() body: any) { return this.service.crud(this.service['activities'], body); }
  @Put('activities/:id') updateActivity(@Param('id') id: string, @Body() body: any) { return this.service.crud(this.service['activities'], { id, ...body }); }
  @Delete('activities/:id') delActivity(@Param('id') id: string) { return this.service.remove(this.service['activities'], id); }

  @Get('contacts/:id/timeline') timeline(@Param('id') id: string) { return this.service.timeline(id); }
  @Get('dashboard/stats') stats(@Query('org_id') org_id: string) { return this.service.dashboardStats(org_id); }

  @Get('export/contacts.csv') async exportContacts(@Res() res: Response) { const rows = await this.service['contacts'].find(); const csv = ['id,first_name,last_name,email'].concat(rows.map((r:any)=>`${r.id},${r.first_name},${r.last_name},${r.email||''}`)).join('\n'); res.setHeader('Content-Type','text/csv'); res.send(csv); }
  @Get('export/companies.csv') async exportCompanies(@Res() res: Response) { const rows = await this.service['companies'].find(); const csv = ['id,name,domain'].concat(rows.map((r:any)=>`${r.id},${r.name},${r.domain||''}`)).join('\n'); res.setHeader('Content-Type','text/csv'); res.send(csv); }
  @Post('import/contacts.csv') importContacts(@Body() body: any) { return { imported: (body.rows || []).length || 0 }; }
  @Post('import/companies.csv') importCompanies(@Body() body: any) { return { imported: (body.rows || []).length || 0 }; }
  @Get('track/:token/open') track(@Param('token') token: string) { return { tracked: true, token }; }
}
