//モジュール
const fs = require("fs");
const sqlite = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const uuid = require("uuid");
require("date-utils");

//サーバーのタイムゾーン
const timeZone = "Asia/Tokyo";

exports.userRegister = (userName, email, password, age) => {
  try {
    // DBを開く
    const db = new sqlite.Database('../db/main.sqlite');
    // SQL を同期的に実行する
    db.serialize(() => {
      // 現在時刻(サーバーロケーション)を取得
      const dt = new Date();
      const now = dt.toFormat("YYYY/MM/DD HH24-MI-SS");

      const stmt = db.prepare("INSERT INTO members(name, email, password, age, registered) VALUES(?, ?, ?, ?, ?)");

      stmt.run([userName, email, bcrypt.hashSync(password, 10), age, now]);

      stmt.finalize(); // prepareなら必須
      db.close(); // DBを閉じる
      // ロギング
      fs.appendFile("../logs/debater-db.txt", `UserRegister: userName=${userName} date=${now}\n`, e => {
        if (e) console.log(e);
      });
      // エラーが無ければur100を返す。
      return "ur100";
    });

  } catch (e) {
    // エラーコード
    return "ur101";
  }
}

exports.userLogin = (email, password) => {
  try {
    //DBを開く
    const db = new sqlite.Database('../db/main.sqlite');

    // SQL を同期的に実行する
    db.serialize(() => {
      // 現在時刻(サーバーロケーション)を取得
      const dt = new Date();
      const now = dt.toFormat("YYYY/MM/DD HH24-MI-SS");

      db.each("SELECT * FROM members WHERE email=?", [email], (e, row) => {
        if (e) return `loginError:${e}`;
        if (row) {

          // モジュール呼び出し元に返すユーザー情報
          const userData = {
            "name": row.name,
            "password": row.password,
            "permission": row.permission,
            "isTeam": row.isTeam,
            "teamIds": row.teamIds,
            "missedLoginTimes": row.missedLoginTimes
          };
          const isMatch = bcrypt.compareSync(password, userData.password);
          const isLocked = userData.missedLoginTimes >= 10
          if (isMatch && !isLocked) {

            const stmt = db.prepare("UPDATE members SET lastLogin=?, missedLoginTimes=0");
            stmt.run([now]);

            stmt.finalize(); // prepareなら必須

            // ロギング
            fs.appendFile("../logs/debater-db.txt", `Login: userName=${userData.name} date=${now}\n`, e => {
              if (e) console.log(e);
            });
            // ユーザー情報を返す。
            console.log(userData);
            return userData;
          } else if (!isMatch) {
            // エラーコード
            return "ul203";
          } else if (isLocked) {
            // ロギング
            fs.appendFile("../logs/debater-db.txt", `Error: user is locked userName=${userData.name} date=${now}\n`, e => {
              if (e) console.log(e);
            });
            // エラーコード
            return "ul204";
          }
        } else {
          // エラーコード
          return "ul202";
        }
        db.close(); // DBを閉じる
      });
    });

  } catch (e) {
    if (e) console.log(e);
    // エラーコード
    return "ul201";
  }
}

exports.gameRegister = (name, organizer, isTeam, description) => {
  try {
    const db = new sqlite.Database('../db/main.sqlite'); // DBを開く

    // SQL を同期的に実行する
    db.serialize(() => {
      // 現在時刻(サーバーロケーション)を取得
      const dt = new Date();
      const now = dt.toFormat("YYYY/MM/DD HH24-MI-SS");
      const id = uuid.v1({
        node: [0X01, 0X02, 0X03, 0X04, 0X05, 0X06],
        clockseq: 0X1234,
        msecs: new Date(),
        nsecs: 1234
      }, buf, 0);

      const stmt = db.prepare("INSERT INTO games(id, organizer, isTeam, registered,description) VALUES(?, ?, ?, ?, ?, ?)");
      stmt.run([id, name, organizer, isTeam ? 1 : 0, now, description]);

      stmt.finalize();
      db.close(); // DBを閉じる
      // ロギング
      fs.appendFile("../logs/debater-db.txt", `GameRegister: gameName=${name} userName=${organizer} date=${now}\n`, e => {
        if (e) console.log(e);
      });
      // エラーが無ければur100を返す。
      return "gr100";
    });
  } catch (e) {
    console.log(e);
    return e;
  }
}

exports.gamesListUp = () => {
  try {
    const db = new sqlite.Database('../db/main.sqlite'); // DBを開く
    var result = "";

    // SQL を同期的に実行する
    db.serialize(() => {
      db.each("SELECT * FROM games", (e, row) => {
        if (e) return `loginError:${e}`;
        if (row) {
          result += `<li><a href="/games/${row.id}" class="game_name_a">${row.name}</a>  主催：${row.organizer}</li>`
        }
      });
      db.close(); // DBを閉じる
      return result;
    });
  } catch (e) {
    console.log(e);
    return e;
  }
}