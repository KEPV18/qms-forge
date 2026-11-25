import {describe,it,expect,vi,afterEach} from 'vitest';
import {preWriteValidation} from '../preWriteValidation';
const fresh=async(v?:string)=>{vi.resetModules();vi.stubEnv('VITE_DEFAULT_AUTHOR',v);return (await import('../../config/author')).DEFAULT_AUTHOR;};
afterEach(()=>{vi.unstubAllEnvs();vi.resetModules();});
describe('public default author configuration, no authenticated identity claim',()=>{
 it('uses explicit system identity when unset',async()=>expect(await fresh(undefined)).toBe('system@example.com'));
 it('uses explicit system identity when empty',async()=>expect(await fresh('')).toBe('system@example.com'));
 it('uses explicit system identity when whitespace only',async()=>expect(await fresh('   ')).toBe('system@example.com'));
 it('trims configured public label',async()=>expect(await fresh('  author@example.test  ')).toBe('author@example.test'));
 it('preserves an explicit existing creator through validation',()=>{
  const result=preWriteValidation('F/12',{serial:'auto',date:'2026-04-20',project_name:'Synthetic test',nc_type:'Major',description:'Synthetic test',root_cause:'Synthetic test',corrective_action:'Synthetic test',status:'Open',reported_by:'Demo',_createdBy:'existing@example.test'},'create');
  expect(result.valid).toBe(true);expect(result.sanitizedData?._createdBy).toBe('existing@example.test');
 });
});
