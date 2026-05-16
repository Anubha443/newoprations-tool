import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Activity, Company, Contact, Deal, Email, Pipeline, PipelineStage } from './entities';

@Injectable()
export class CrmService {
  constructor(@InjectRepository(Contact) private contacts: Repository<Contact>, @InjectRepository(Company) private companies: Repository<Company>, @InjectRepository(Deal) private deals: Repository<Deal>, @InjectRepository(Pipeline) private pipelines: Repository<Pipeline>, @InjectRepository(PipelineStage) private stages: Repository<PipelineStage>, @InjectRepository(Activity) private activities: Repository<Activity>, @InjectRepository(Email) private emails: Repository<Email>) {}
  crud(repo: Repository<any>, body: any) { return repo.save(body); }
  async remove(repo: Repository<any>, id: string) { await repo.delete(id); return { ok: true }; }
  searchContacts(q: string) { return this.contacts.find({ where: [{ first_name: ILike(`%${q}%`) }, { last_name: ILike(`%${q}%`) }, { email: ILike(`%${q}%`) }] }); }
  async board(pipelineId: string) { const stages = await this.stages.find({ where: { pipeline_id: pipelineId }, order: { position: 'ASC' } }); const deals = await this.deals.find({ where: { pipeline_id: pipelineId } }); return stages.map((s) => ({ stage: s, deals: deals.filter((d) => d.stage_id === s.id) })); }
  async timeline(contactId: string) { const [activities, emails, deals] = await Promise.all([this.activities.find({ where: { contact_id: contactId } }), this.emails.find({ where: { contact_id: contactId } }), this.deals.find({ where: { contact_id: contactId } })]); return { activities, emails, deals }; }
  async dashboardStats(org_id: string) { const deals = await this.deals.find({ where: { org_id } }); const won = deals.filter((d) => d.status === 'won').length; const lost = deals.filter((d) => d.status === 'lost').length; return { totalDeals: deals.length, won, lost, conversionRate: deals.length ? won / deals.length : 0 }; }
}
