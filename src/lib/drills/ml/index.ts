import type { DrillGenerator } from '../types';
import { assocRulesGenerator } from './assocRules';
import { cnnShapeGenerator } from './cnnShape';
import { confusionGenerator } from './confusion';
import { distanceGenerator } from './distance';
import { entropyGiniGenerator } from './entropyGini';
import { kfoldGenerator } from './kfold';
import { kmeansGenerator } from './kmeans';
import { movingAverageGenerator } from './movingAverage';
import { naiveBayesGenerator } from './naiveBayes';
import { oddsGenerator } from './odds';
import { pcaVarianceGenerator } from './pcaVariance';
import { perceptronGenerator } from './perceptron';
import { regMetricsGenerator } from './regMetrics';
import { regressionGenerator } from './regression';
import { rSquaredGenerator } from './rSquared';
import { tfidfGenerator } from './tfidf';

// Modeling / evaluation drill families (metrics, trees, distances, neural nets, ...).
export const ML_GENERATORS: readonly DrillGenerator[] = [
  confusionGenerator,
  regMetricsGenerator,
  rSquaredGenerator,
  regressionGenerator,
  oddsGenerator,
  entropyGiniGenerator,
  perceptronGenerator,
  assocRulesGenerator,
  distanceGenerator,
  kmeansGenerator,
  cnnShapeGenerator,
  pcaVarianceGenerator,
  movingAverageGenerator,
  naiveBayesGenerator,
  tfidfGenerator,
  kfoldGenerator,
];
