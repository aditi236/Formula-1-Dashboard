// polePositions
export async function processPolePositions() {
    try {
      const filePath = 'assets/data/f1db-races-qualifying-results.csv';
      const data = await window.d3.csv(filePath);
  
      //group by driverId
      const driverRollup = window.d3.rollup(
        data,
        rowsForDriver => {
          //group by year
          const yearMap = window.d3.group(rowsForDriver, d => d.year);
  
          //for each year, count how many times position=1
          for (const [year, arr] of yearMap) {
            const polesThisYear = arr.filter(r => +r.positionNumber === 1).length;
            yearMap.set(year, polesThisYear);
          }
  
          return Object.fromEntries(yearMap);
        },
        d => d.driverId
      );
  
      return Object.fromEntries(driverRollup);
  
    } catch (error) {
      console.error('Error processing pole positions:', error);
      throw error;
    }
  }

  async function main() {
    try {
      const result = await processPolePositions();
      console.log(result);
    } catch (error) {
      console.error(error);
    }
  }
  