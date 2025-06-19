// championshipPosition
export async function processChampionshipPosition() {
    try {
      const filePath = 'assets/data/f1db-seasons-driver-standings.csv';
      const data = await window.d3.csv(filePath);
  
      //group by driverId
      const driverRollup = window.d3.rollup(
        data,
        rowsForDriver => {
          const yearMap = window.d3.group(rowsForDriver, d => d.year);
          for (const [year, yearData] of yearMap) {
            //sort ascending so the first element is the best position
            yearData.sort((a, b) => window.d3.ascending(+a.positionNumber, +b.positionNumber));
            const bestRow = yearData[0];
            yearMap.set(year, +bestRow.positionNumber);
          }
  
          //map - object (year -> bestPosition)
          return Object.fromEntries(yearMap);
        },
        d => d.driverId
      );
  
      //outer map -> object (driverId -> {year -> positionNumber})
      return Object.fromEntries(driverRollup);
  
    } catch (error) {
      console.error('Error processing championship positions:', error);
      throw error;
    }
  }

  async function main() {
    try {
      const positionCounts = await processChampionshipPosition();
      console.log(positionCounts);
    } catch (error) {
      console.error('Error:', error);
    }
  }
  