const fs = require('fs');
const file = '/home/aviinyou07/Projects/a23/backend/src/controllers/game.controller.js';
let content = fs.readFileSync(file, 'utf8');

// 1. import formatDate
content = content.replace(
  'isResultVisible,\n  canSettleGame,\n} = require(\'../utils/game-time\');',
  'isResultVisible,\n  canSettleGame,\n  formatDate,\n} = require(\'../utils/game-time\');'
);

// 2. update gameDateMap
content = content.replace(
  '    const gameDateMap = games.map((g) => ({\n      id: g.id,\n      currentSessionDate: getResultDate(g, now),\n    }));',
  '    const gameDateMap = games.map((g) => ({\n      id: g.id,\n      currentSessionDate: getResultDate(g, now),\n      todayDate: formatDate(now),\n    }));'
);

// 3. update allDates
content = content.replace(
  '      const allDates = [...new Set(gameDateMap.map((d) => d.currentSessionDate))];',
  '      const allDates = [...new Set([...gameDateMap.map((d) => d.currentSessionDate), ...gameDateMap.map((d) => d.todayDate)])];'
);

// 4. update mapping loop
content = content.replace(
  '    for (const g of games) {\n      const { currentSessionDate } = gameDateMap.find((d) => d.id === g.id);\n\n      const currentResult = resultMap[`${g.id}:${currentSessionDate}`] || null;\n      const lastResult = recentMap[g.id] || null;',
  '    for (const g of games) {\n      const { currentSessionDate, todayDate } = gameDateMap.find((d) => d.id === g.id);\n\n      const currentResult = resultMap[`${g.id}:${currentSessionDate}`] || null;\n      const todayResult = resultMap[`${g.id}:${todayDate}`] || null;\n      const lastResult = recentMap[g.id] || null;'
);

// 5. assign today_result_number
content = content.replace(
  '      g.current_session_date = currentSessionDate;',
  '      g.current_session_date = currentSessionDate;\n\n      // Today info\n      g.today_result_number = todayResult ? todayResult.result_number : null;\n      g.today_result_date = todayResult ? todayResult.result_date : todayDate;\n      g.is_today_result_settled = todayResult ? !!todayResult.is_settled : null;\n      g.today_result_visible = todayResult ? isResultVisible(g, todayDate, now) : false;'
);

fs.writeFileSync(file, content);
