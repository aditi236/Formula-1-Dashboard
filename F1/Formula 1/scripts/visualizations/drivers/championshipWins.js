// championshipWins
export async function processChampionshipWins() {
    try {
      const filePath = 'assets/data/f1db-seasons-driver-standings.csv';
      const data = await window.d3.csv(filePath);
  
      //group by driverId
      const driverRollup = window.d3.rollup(
        data,
        rowsForDriver => {
          //group by year
          const yearMap = window.d3.group(rowsForDriver, d => d.year);
  
          //for each year, check if positionNumber=1
          for (const [year, arr] of yearMap) {
            const isChampion = arr.some(r => +r.positionNumber === 1) ? 1 : 0;
            yearMap.set(year, isChampion);
          }
  
          return Object.fromEntries(yearMap);
        },
        d => d.driverId
      );

      return Object.fromEntries(driverRollup);
  
    } catch (error) {
      console.error('Error processing championship wins:', error);
      throw error;
    }
  }
  
  async function main() {
    try {
      const result = await processChampionshipWins();
      console.log(result);
    } catch (error) {
      console.error(error);
    }
  }
  