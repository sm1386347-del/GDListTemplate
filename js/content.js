import { round, score } from './score.js';

/**
 * Path to directory containing `_list.json` and all levels
 */
const dir = 'data';

export async function fetchList() {
    const listResult = await fetch(`${dir}/_list.json`);
    try {
        const list = await listResult.json();
        return await Promise.all(
            list.map(async (path, rank) => {
                const levelResult = await fetch(`${dir}/${path}.json`);
                try {
                    const level = await levelResult.json();
                    return [
                        {
                            ...level,
                            path,
                            records: level.records.sort(
                                (a, b) => b.percent - a.percent,
                            ),
                        },
                        null,
                    ];
                } catch {
                    console.error(`Failed to load level #${rank + 1} ${path}.`);
                    return [null, path];
                }
            }),
        );
    } catch {
        return null;
    }
}

export async function fetchEditors() {
    const editorsResults = await fetch(`${dir}/_editors.json`);
    try {
        const editors = await editorsResults.json();
        return editors;
    } catch {
        return null;
    }
}

export async function fetchLeaderboard() {
    const list = await fetchList();
    const editors = await fetchEditors();
    if (!list || !editors) {
        return null;
    }

    const scoreMap = {};
    const errs = [];

    list.forEach((res, rank) => {
        if (!res) {
            return;
        }
        const [level, err] = res;
        if (err) {
            errs.push(err);
            return;
        }

        const count = level.records.length;
        const total = level.list;

        level.records.forEach((record) => {
            const user = record.user;
            scoreMap[user] = scoreMap[user] || {
                score: 0,
                records: [],
            };

            scoreMap[user].records.push({
                rank: rank + 1,
                level: level.name,
                score: score(rank + 1, record.percent, level.percent),
                link: record.link,
            });
        });
    });

    for (const user in scoreMap) {
        scoreMap[user].score = round(
            scoreMap[user].records.reduce((a, b) => a + b.score, 0),
        );
    }

    const leaderboard = Object.keys(scoreMap).map((user) => ({
        user,
        score: scoreMap[user].score,
        records: scoreMap[user].records,
    }));

    leaderboard.sort((a, b) => b.score - a.score);

    return [leaderboard, errs];
}
