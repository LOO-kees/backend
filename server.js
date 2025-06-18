// server.js

/**
 * ================================
 *  공통 설정: Express + 미들웨어
 * ================================
 */
const express = require('express');         // express 기본 라우팅
const app = express();                      // express 인스턴스 생성
const port = 9070;                          // 사용할 포트 (kdt/지니펫 공통)
const cors = require('cors');               // CORS 허용 미들웨어
const mysql = require('mysql');             // MySQL 연결 라이브러리
const bcrypt = require('bcrypt');           // bcrypt 해시 암호화
const jwt = require('jsonwebtoken');        // JWT 생성/검증
const SECRET_KEY = 'test';                  // JWT 서명용 비밀 키 (예시)

/**
 * CORS 허용
 * app.use(cors())만 있으면 모든 도메인/포트에서의 요청을 허용합니다.
 * 필요 시 options 객체를 넣어서 특정 도메인만 허용하도록 수정할 수 있습니다.
 */
app.use(cors());
app.use(express.json()); // JSON 요청 본문(body)을 파싱할 수 있게 해줍니다.

/**
 * ======================================
 * 1. MySQL 연결 정보 (kdt 데이터베이스)
 * ======================================
 */
const connectionKdt = mysql.createConnection({
  host: 'database',    // CloudType 환경에서 MySQL 서비스 이름을 'database'로 정의했다면 이 값을 사용
  user: 'root',
  password: '1234',
  database: 'kdt'
});

connectionKdt.connect((err) => {
  if (err) {
    console.log('MYSQL(kdt) 연결 실패 : ', err);
    return;
  }
  console.log('MYSQL(kdt) 연결 성공');
});

/**
 * ======================================
 * 2. MySQL 연결 정보 (ginipet 전용 데이터베이스)
 * ======================================
 *
 * 만약 “ginipet_users” 테이블을 별도의 데이터베이스에 두고 싶다면
 * 아래의 `database: 'ginipet'` 처럼 DB 이름을 수정하세요.
 * 별도의 DB를 만들지 않고 kdt 내부에 테이블만 추가했다면
 * `database: 'kdt'`를 그대로 쓰시면 됩니다.
 */
const connectionGini = mysql.createConnection({
  host: 'database',    // CloudType 환경 내에서 MySQL 컨테이너/서비스 이름 (예: 'database')
  user: 'root',
  password: '1234',
  database: 'ginipet'  // ※ 별도의 DB를 생성했다면 'ginipet'으로, kdt DB 안에 테이블만 추가했다면 'kdt'로 변경
});

connectionGini.connect((err) => {
  if (err) {
    console.log('MYSQL(ginipet) 연결 실패 : ', err);
    return;
  }
  console.log('MYSQL(ginipet) 연결 성공');
});

/**
 * ======================================
 * 3. 기존 kdt 프로젝트용 라우트
 * ======================================
 */

// 3-1. 로그인 (users 테이블) -----------------------------------
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  connectionKdt.query(
    'SELECT * FROM users WHERE username = ?',
    [username],
    async (err, results) => {
      if (err || results.length === 0) {
        return res.status(401).json({ error: '아이디 또는 비밀번호가 틀립니다.' });
      }

      const user = results[0];
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: '아이디 또는 비밀번호가 틀립니다.' });
      }

      // 토큰 생성(1시간 유효)
      const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, {
        expiresIn: '1h'
      });
      res.json({ token });
    }
  );
});

// 3-2. 회원가입 (users 테이블) ---------------------------------
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hash = await bcrypt.hash(password, 10); // 패스워드 bcrypt 해시 암호화

  connectionKdt.query(
    'INSERT INTO users (username, password) VALUES (?, ?)',
    [username, hash],
    (err) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ error: '이미 존재하는 아이디 입니다.' });
        }
        return res.status(500).json({ error: '회원가입 실패' });
      }
      res.json({ success: true });
    }
  );
});

// 3-3. 로그인2 (users2 테이블) ---------------------------------
app.post('/login2', (req, res) => {
  const { username, password } = req.body;

  connectionKdt.query(
    'SELECT * FROM users2 WHERE username = ?',
    [username],
    async (err, results) => {
      if (err || results.length === 0) {
        return res.status(401).json({ error: '아이디 또는 비밀번호가 틀립니다.' });
      }

      const user = results[0];
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: '아이디 또는 비밀번호가 틀립니다.' });
      }

      // 토큰 생성(1시간 유효)
      const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, {
        expiresIn: '1h'
      });
      res.json({ token });
    }
  );
});

// 3-4. 회원가입2 (users2 테이블) -------------------------------
app.post('/register2', async (req, res) => {
  const { username, password, email, tel } = req.body;
  const hash = await bcrypt.hash(password, 10); // 패스워드 bcrypt 해시 암호화

  connectionKdt.query(
    'INSERT INTO users2 (username, password, email, tel) VALUES (?, ?, ?, ?)',
    [username, hash, email, tel],
    (err) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ error: '이미 존재하는 아이디 입니다.' });
        }
        return res.status(500).json({ error: '회원가입 실패' });
      }
      res.json({ success: true });
    }
  );
});

// 3-5. 상품목록 조회하기 (goods 테이블) ----------------------------
app.get('/goods', (req, res) => {
  connectionKdt.query(
    'SELECT * FROM goods ORDER BY g_code DESC',
    (err, results) => {
      if (err) {
        console.log('쿼리문 오류 (goods 조회) : ', err);
        res.status(500).json({ error: 'DB쿼리 오류' });
        return;
      }
      res.json(results);
    }
  );
});

// 3-6. 상품삭제(DELETE) (DELETE /goods/:g_code) -----------------
app.delete('/goods/:g_code', (req, res) => {
  const g_code = req.params.g_code;
  connectionKdt.query(
    'DELETE FROM goods WHERE g_code = ?',
    [g_code],
    (err, result) => {
      if (err) {
        console.log('삭제 오류 (goods):', err);
        res.status(500).json({ error: '상품 삭제 실패' });
        return;
      }
      res.json({ success: true });
    }
  );
});

// 3-7. 상품수정 (UPDATE /goods/update/:g_code) -------------------
app.put('/goods/update/:g_code', (req, res) => {
  const g_code = req.params.g_code;
  const { g_name, g_cost } = req.body;

  connectionKdt.query(
    'UPDATE goods SET g_name = ?, g_cost = ? WHERE g_code = ?',
    [g_name, g_cost, g_code],
    (err, result) => {
      if (err) {
        console.log('수정 오류 (goods):', err);
        res.status(500).json({ error: '상품 수정 실패' });
        return;
      }
      res.json({ success: true });
    }
  );
});

// 3-8. 특정상품 조회하기 (GET /goods/:g_code) --------------------
app.get('/goods/:g_code', (req, res) => {
  const g_code = req.params.g_code;

  connectionKdt.query(
    'SELECT * FROM goods WHERE g_code = ?',
    [g_code],
    (err, results) => {
      if (err) {
        console.log('조회 오류 (goods 상세):', err);
        res.status(500).json({ error: '상품 조회 실패' });
        return;
      }
      if (results.length === 0) {
        res.status(404).json({ error: '해당 상품이 없습니다.' });
        return;
      }
      res.json(results[0]); // 단일 객체 반환
    }
  );
});

// 3-9. 상품 등록하기 (POST /goods) -------------------------------
app.post('/goods', (req, res) => {
  const { g_name, g_cost } = req.body;
  if (!g_name || !g_cost) {
    return res.status(400).json({ error: '필수 항목이 누락되었습니다. 다시 확인하세요.' });
  }

  connectionKdt.query(
    'INSERT INTO goods (g_name, g_cost) VALUES (?, ?)',
    [g_name, g_cost],
    (err, result) => {
      if (err) {
        console.log('DB등록 실패 (goods):', err);
        res.status(500).json({ error: '상품 등록 실패' });
        return;
      }
      res.json({ success: true, insertId: result.insertId });
    }
  );
});

// *********** 여기까지 goods 데이터 *************


// *********** 여기부터 books 데이터 *************

// 3-10. 도서목록 조회하기 (GET /books) ----------------------------
app.get('/books', (req, res) => {
  connectionKdt.query(
    'SELECT * FROM book_store',
    (err, results) => {
      if (err) {
        console.log('쿼리문 오류 (book 조회):', err);
        res.status(500).json({ error: 'DB쿼리 오류' });
        return;
      }
      res.json(results);
    }
  );
});

// 3-11. 도서등록하기 (POST /books) -----------------------------
app.post('/books', (req, res) => {
  const { name, area1, area2, area3, BOOK_CNT, owner_nm, tel_num } = req.body;
  if (!name || !BOOK_CNT) {
    return res.status(400).json({ error: '필수 항목이 누락되었습니다. 다시 확인하세요.' });
  }

  connectionKdt.query(
    'INSERT INTO book_store (name, area1, area2, area3, BOOK_CNT, owner_nm, tel_num) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, area1, area2, area3, BOOK_CNT, owner_nm, tel_num],
    (err, result) => {
      if (err) {
        console.log('DB등록 실패 (book):', err);
        res.status(500).json({ error: '도서 등록 실패' });
        return;
      }
      res.json({ success: true, insertId: result.insertId });
    }
  );
});

// 3-12. 특정 도서 조회하기 (GET /books/:num) --------------------
app.get('/books/:num', (req, res) => {
  const num = req.params.num;
  connectionKdt.query(
    'SELECT * FROM book_store WHERE num = ?',
    [num],
    (err, results) => {
      if (err) {
        console.log('조회 오류 (book 상세):', err);
        res.status(500).json({ error: '도서 조회 실패' });
        return;
      }
      if (results.length === 0) {
        res.status(404).json({ error: '해당 도서가 없습니다.' });
        return;
      }
      res.json(results[0]);
    }
  );
});

// 3-13. 도서삭제 (DELETE /books/:num) ---------------------
app.delete('/books/:num', (req, res) => {
  const num = req.params.num;
  connectionKdt.query(
    'DELETE FROM book_store WHERE num = ?',
    [num],
    (err, result) => {
      if (err) {
        console.log('삭제 오류 (book):', err);
        res.status(500).json({ error: '도서 삭제 실패' });
        return;
      }
      res.json({ success: true });
    }
  );
});

// 3-14. 도서수정 (PUT /books/update/:num) -----------------
app.put('/books/update/:num', (req, res) => {
  const num = req.params.num;
  const { name, area1, area2, area3, BOOK_CNT, owner_nm, tel_num } = req.body;
  connectionKdt.query(
    'UPDATE book_store SET name = ?, area1 = ?, area2 = ?, area3 = ?, BOOK_CNT = ?, owner_nm = ?, tel_num = ? WHERE num = ?',
    [name, area1, area2, area3, BOOK_CNT, owner_nm, tel_num, num],
    (err, result) => {
      if (err) {
        console.log('수정 오류 (book):', err);
        res.status(500).json({ error: '도서 수정 실패' });
        return;
      }
      res.json({ success: true });
    }
  );
});

// *********** 여기까지 books 데이터 *************


// *********** 여기부터 fruits 데이터 *************

// 3-15. 상품 조회하기 (GET /fruits) ------------------------
app.get('/fruits', (req, res) => {
  connectionKdt.query(
    'SELECT * FROM fruit ORDER BY num DESC',
    (err, results) => {
      if (err) {
        console.log('쿼리문 오류 (fruit 조회):', err);
        res.status(500).json({ error: 'DB쿼리 오류' });
        return;
      }
      res.json(results);
    }
  );
});

// 3-16. 상품 등록하기 (POST /fruits) --------------------------
app.post('/fruits', (req, res) => {
  const { name, price, color, country } = req.body;
  if (!name || !price || !color || !country) {
    return res.status(400).json({ erro: '필수 항목이 누락되었습니다. 다시 확인하세요.' });
  }

  connectionKdt.query(
    'INSERT INTO fruit (name, price, color, country) VALUES (?, ?, ?, ?)',
    [name, price, color, country],
    (err, result) => {
      if (err) {
        console.log('등록 오류 (fruit):', err);
        res.status(500).json({ error: '상품 등록 실패' });
        return;
      }
      res.json({ success: true, insertId: result.insertId });
    }
  );
});

// 3-17. 특정 과일 조회하기 (GET /fruits/:num) -----------------
app.get('/fruits/:num', (req, res) => {
  const num = req.params.num;
  connectionKdt.query(
    'SELECT * FROM fruit WHERE num = ?',
    [num],
    (err, results) => {
      if (err) {
        console.log('조회 오류 (fruit 상세):', err);
        res.status(500).json({ error: '과일 조회 실패' });
        return;
      }
      if (results.length === 0) {
        res.status(404).json({ error: '해당 과일이 없습니다.' });
        return;
      }
      res.json(results[0]);
    }
  );
});

// 3-18. 과일 삭제하기 (DELETE /fruits/:num) ------------------
app.delete('/fruits/:num', (req, res) => {
  const num = req.params.num;
  connectionKdt.query(
    'DELETE FROM fruit WHERE num = ?',
    [num],
    (err, result) => {
      if (err) {
        console.log('삭제 오류 (fruit):', err);
        res.status(500).json({ error: '과일 삭제 실패' });
        return;
      }
      res.json({ success: true });
    }
  );
});

// 3-19. 과일 수정하기 (PUT /fruits/update/:num) ---------------
app.put('/fruits/update/:num', (req, res) => {
  const num = req.params.num;
  const { name, price, color, country } = req.body;
  if (!name || !price || !color || !country) {
    return res.status(400).json({ error: '필수 항목이 누락되었습니다. 다시 확인하세요.' });
  }
  connectionKdt.query(
    'UPDATE fruit SET name = ?, price = ?, color = ?, country = ? WHERE num = ?',
    [name, price, color, country, num],
    (err, result) => {
      if (err) {
        console.log('수정 오류 (fruit):', err);
        res.status(500).json({ error: '과일 수정 실패' });
        return;
      }
      res.json({ success: true });
    }
  );
});

// *********** 여기까지 fruits 데이터 *************


// *********** 여기부터 question 데이터 *************

// 3-20. 질문 등록하기 (POST /question) -----------------------
app.post('/question', (req, res) => {
  const { name, tel, email, txtbox } = req.body;
  if (!name || !tel || !email || !txtbox) {
    return res.status(400).json({ error: '필수 항목이 누락되었습니다. 다시 확인하세요' });
  }
  connectionKdt.query(
    'INSERT INTO question (name, tel, email, txtbox) VALUES (?, ?, ?, ?)',
    [name, tel, email, txtbox],
    (err, result) => {
      if (err) {
        console.log('등록 오류 (question):', err);
        res.status(500).json({ error: '데이터 입력 오류' });
        return;
      }
      res.send('질문 등록 완료');
    }
  );
});

// *********** 여기까지 question 데이터 *************



/**
 * ======================================
 * 4. 지니펫(Ginipet) 전용 라우트 (ginipet_users 테이블)
 * ======================================
 *
 * 기존에 사용하시던 /register, /login2 라우트와 충돌하지 않도록,
 * 지니펫 전용 회원가입/로그인 엔드포인트에는 “/ginipet” 접두사를 붙였습니다.
 * 예) POST /ginipet/register, POST /ginipet/login
 */

// 4-1. 지니펫 회원가입 (POST /ginipet/register) ----------------------------
app.post('/ginipet/register', async (req, res) => {
  const { username, password, tel, email } = req.body;
  const hash = await bcrypt.hash(password, 10); // 패스워드 bcrypt 해시 암호화

  connectionGini.query(
    'INSERT INTO ginipet_users (username, password, tel, email) VALUES (?, ?, ?, ?)',
    [username, hash, tel, email],
    (err) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ error: '이미 존재하는 아이디입니다.' });
        }
        return res.status(500).json({ error: '회원가입 실패' });
      }
      res.json({ success: true });
    }
  );
});

// 4-2. 지니펫 로그인 (POST /ginipet/login) ------------------------------
app.post('/ginipet/login', (req, res) => {
  const { username, password } = req.body;

  connectionGini.query(
    'SELECT * FROM ginipet_users WHERE username = ?',
    [username],
    async (err, results) => {
      if (err || results.length === 0) {
        return res.status(401).json({ error: '아이디 또는 비밀번호가 틀렸습니다.' });
      }

      const user = results[0];
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(401).json({ error: '아이디 또는 비밀번호가 틀립니다.' });
      }

      // 토큰 생성 후 응답
      const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, {
        expiresIn: '1h'
      });
      return res.json({ token });
    }
  );
});

// 4-3. (GET /ginipet/join) 예시, 필요 시 구현 -----------------------
app.get('/ginipet/join', (req, res) => {
  // 필요하시면 실제 로직을 추가하세요.
  res.json('Excused from ginipet backend');
});


/**
 * ======================================
 * 5. 서버 실행
 * ======================================
 */
app.listen(port, () => {
  console.log('Listening...');
  console.log('▶ kdt 백엔드 & ginipet 백엔드가 통합되어 실행 중입니다.');
});
