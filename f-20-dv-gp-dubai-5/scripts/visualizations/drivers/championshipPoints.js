// championshipPoints
export async function processChampionshipPoints() {
    try {
      const filePath = 'assets/data/f1db-seasons-driver-standings.csv';
      const data = await window.d3.csv(filePath);
  
      const championshipPoints = window.d3.rollup(
        data,
        rowsForThisDriver => {
          const groupedByYear = window.d3.group(rowsForThisDriver, d => d.year);
  
          for (const [year, yearData] of groupedByYear) {
            yearData.sort((a, b) => window.d3.descending(+a.points, +b.points));
          }
  
          //year - rows sorted by descending points
          return Object.fromEntries(groupedByYear);
        },
        d => d.driverId
      );
  
      return Object.fromEntries(championshipPoints);
  
    } catch (error) {
      console.error('Error processing championship points:', error);
      throw error;
    }
  }

  async function main() {
    try {
      const pointsCounts = await processChampionshipPoints();
      console.log(pointsCounts);
    } catch (error) {
      console.error('Error:', error);
    }
  }
  