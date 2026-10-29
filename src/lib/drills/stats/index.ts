import type { DrillGenerator } from '../types';
import { BAYES } from './bayes';
import { BINOMIAL } from './binomial';
import { CHI_EXPECTED } from './chisq';
import { CORRELATION } from './correlation';
import { CV } from './cv';
import { DATA_UNITS } from './dataunits';
import { DESCRIPTIVE } from './descriptive';
import { DOF } from './dof';
import { EXPECTATION } from './expectation';
import { toGenerator, type DrillFamily } from './family';
import { QUARTILE } from './quartile';
import { SAMPLE_SIZE } from './samplesize';
import { SCALING } from './scaling';
import { STD_ERROR } from './stderror';
import { STRATIFIED } from './stratified';
import { VARIANCE } from './variance';

// Statistics drill families (descriptive stats, probability, estimation, testing).
export const STATS_FAMILIES: readonly DrillFamily<unknown>[] = [
  DESCRIPTIVE,
  VARIANCE,
  QUARTILE,
  SCALING,
  CV,
  BAYES,
  BINOMIAL,
  EXPECTATION,
  STRATIFIED,
  STD_ERROR,
  SAMPLE_SIZE,
  DOF,
  CHI_EXPECTED,
  CORRELATION,
  DATA_UNITS,
];

export const STATS_GENERATORS: readonly DrillGenerator[] = STATS_FAMILIES.map(f => toGenerator(f));
