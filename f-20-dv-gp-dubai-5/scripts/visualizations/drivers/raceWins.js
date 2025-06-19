// raceWins
export async function processRaceWins() {
    try {
      const filePath = 'assets/data/f1db-races-race-results.csv';
      const data = await window.d3.csv(filePath);
  
      //group by driverId
      const driverRollup = window.d3.rollup(
        data,
        rowsForDriver => {
          //group by year
          const yearMap = window.d3.group(rowsForDriver, d => d.year);
  
          //for each year, count how many times positionNumber=1
          for (const [year, arr] of yearMap) {
            const winsThisYear = arr.filter(r => +r.positionNumber === 1).length;
            yearMap.set(year, winsThisYear);
          }
  
          return Object.fromEntries(yearMap);
        },
        d => d.driverId
      );
  
      return Object.fromEntries(driverRollup);
  
    } catch (error) {
      console.error('Error processing race wins:', error);
      throw error;
    }
  }

  async function main() {
    try {
      const result = await processRaceWins();
      console.log(result);
    } catch (error) {
      console.error(error);
    }
  }
  