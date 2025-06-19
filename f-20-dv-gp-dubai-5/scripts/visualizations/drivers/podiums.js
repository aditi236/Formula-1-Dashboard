// podiums
export async function processPodiums() {
    try {
      const filePath = 'assets/data/f1db-races-race-results.csv';
      const data = await window.d3.csv(filePath);
  
      //group by driverId
      const driverRollup = window.d3.rollup(
        data,
        rowsForDriver => {
          //group by year
          const yearMap = window.d3.group(rowsForDriver, d => d.year);
  
          //for each year, counts how many times positionNumber is in [1..3]
          for (const [year, arr] of yearMap) {
            const podiumsThisYear = arr.filter(r => {
              const pos = +r.positionNumber;
              return pos >= 1 && pos <= 3;
            }).length;
            yearMap.set(year, podiumsThisYear);
          }
  
          return Object.fromEntries(yearMap);
        },
        d => d.driverId
      );
  
      return Object.fromEntries(driverRollup);
  
    } catch (error) {
      console.error('Error processing podiums:', error);
      throw error;
    }
  }

  async function main() {
    try {
      const result = await processPodiums();
      console.log(result);
    } catch (error) {
      console.error(error);
    }
  }
  