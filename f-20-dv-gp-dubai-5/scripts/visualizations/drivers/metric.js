// metrics combined

import { processChampionshipWins } from './championshipWins.js';
import { processRaceWins } from './raceWins.js';
import { processPodiums } from './podiums.js';
import { processPolePositions } from './polePositions.js';
import { processChampionshipPoints } from './championshipPoints.js';
import { processChampionshipPosition } from './championshipPos.js';

export async function aggregateMetrics() {
  try {
    const [
      championshipWins,
      raceWins,
      podiums,
      polePositions,
      championshipPoints,
      championshipPosition
    ] = await Promise.all([
      processChampionshipWins(),
      processRaceWins(),
      processPodiums(),
      processPolePositions(),
      processChampionshipPoints(),
      processChampionshipPosition()
    ]);

    return {
      championshipWins,
      raceWins,
      podiums,
      polePositions,
      championshipPoints,
      championshipPosition
    };
  } catch (error) {
    console.error('Error aggregating metrics:', error);
    throw error;
  }
}

async function main() {
  try {
    const metrics = await aggregateMetrics();
    console.log(metrics);
  } catch (error) {
    console.error('Error:', error);
  }
}
