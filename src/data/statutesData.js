import { offenseSchema } from '../schemas.js';

const rawData = [
  {
    code: 'IPC',
    section: '379',
    title: 'Theft',
    maxMonths: 36,
    isLife: false,
    isDeath: false,
    isBailable: false,
    equivalentSection: '303(2)'
  },
  {
    code: 'BNS',
    section: '303(2)',
    title: 'Theft',
    maxMonths: 36,
    isLife: false,
    isDeath: false,
    isBailable: false,
    equivalentSection: '379'
  },
  {
    code: 'BNS',
    section: '304',
    title: 'Snatching',
    maxMonths: 36,
    isLife: false,
    isDeath: false,
    isBailable: false,
    equivalentSection: null
  },
  {
    code: 'IPC',
    section: '420',
    title: 'Cheating',
    maxMonths: 84,
    isLife: false,
    isDeath: false,
    isBailable: false,
    equivalentSection: '318(4)'
  },
  {
    code: 'BNS',
    section: '318(4)',
    title: 'Cheating',
    maxMonths: 84,
    isLife: false,
    isDeath: false,
    isBailable: false,
    equivalentSection: '420'
  },
  {
    code: 'IPC',
    section: '406',
    title: 'Criminal Breach of Trust',
    maxMonths: 36,
    isLife: false,
    isDeath: false,
    isBailable: false,
    equivalentSection: '316(2)'
  },
  {
    code: 'BNS',
    section: '316(2)',
    title: 'Criminal Breach of Trust',
    maxMonths: 36,
    isLife: false,
    isDeath: false,
    isBailable: false,
    equivalentSection: '406'
  },
  {
    code: 'IPC',
    section: '323',
    title: 'Voluntarily Causing Hurt',
    maxMonths: 12,
    isLife: false,
    isDeath: false,
    isBailable: true,
    equivalentSection: '115(2)'
  },
  {
    code: 'BNS',
    section: '115(2)',
    title: 'Voluntarily Causing Hurt',
    maxMonths: 12,
    isLife: false,
    isDeath: false,
    isBailable: true,
    equivalentSection: '323'
  },
  {
    code: 'IPC',
    section: '325',
    title: 'Grievous Hurt',
    maxMonths: 84,
    isLife: false,
    isDeath: false,
    isBailable: true,
    equivalentSection: '117(2)'
  },
  {
    code: 'BNS',
    section: '117(2)',
    title: 'Grievous Hurt',
    maxMonths: 84,
    isLife: false,
    isDeath: false,
    isBailable: true,
    equivalentSection: '325'
  },
  {
    code: 'IPC',
    section: '506',
    title: 'Criminal Intimidation',
    maxMonths: 24,
    isLife: false,
    isDeath: false,
    isBailable: true,
    equivalentSection: '351(2)'
  },
  {
    code: 'BNS',
    section: '351(2)',
    title: 'Criminal Intimidation',
    maxMonths: 24,
    isLife: false,
    isDeath: false,
    isBailable: true,
    equivalentSection: '506'
  },
  {
    code: 'IPC',
    section: '392',
    title: 'Robbery',
    maxMonths: 120,
    isLife: false,
    isDeath: false,
    isBailable: false,
    equivalentSection: '309(4)'
  },
  {
    code: 'BNS',
    section: '309(4)',
    title: 'Robbery',
    maxMonths: 120,
    isLife: false,
    isDeath: false,
    isBailable: false,
    equivalentSection: '392'
  },
  {
    code: 'IPC',
    section: '302',
    title: 'Murder',
    maxMonths: 0,
    isLife: true,
    isDeath: true,
    isBailable: false,
    equivalentSection: '103(1)'
  },
  {
    code: 'BNS',
    section: '103(1)',
    title: 'Murder',
    maxMonths: 0,
    isLife: true,
    isDeath: true,
    isBailable: false,
    equivalentSection: '302'
  },
  {
    code: 'IPC',
    section: '307',
    title: 'Attempt to Murder',
    maxMonths: 120,
    isLife: true,
    isDeath: false,
    isBailable: false,
    equivalentSection: '109'
  },
  {
    code: 'BNS',
    section: '109',
    title: 'Attempt to Murder',
    maxMonths: 120,
    isLife: true,
    isDeath: false,
    isBailable: false,
    equivalentSection: '307'
  },
  {
    code: 'IPC',
    section: '160',
    title: 'Simple Affray',
    maxMonths: 1,
    isLife: false,
    isDeath: false,
    isBailable: true,
    equivalentSection: '194'
  },
  {
    code: 'BNS',
    section: '194',
    title: 'Simple Affray',
    maxMonths: 1,
    isLife: false,
    isDeath: false,
    isBailable: true,
    equivalentSection: '160'
  }
];

export const statutesData = rawData.map((item) => offenseSchema.parse(item));
export default statutesData;
