const express = require('express'); //express 기본 라우팅
const app = express(); //express 기본 라우팅
const port = 9070;

const cors = require('cors'); //교차출처공유 허용하기 위함
const mysql = require('mysql');  //mysql변수 선언
const bcrypt = require('bcrypt'); //해시암호화
const jwt = require('jsonwebtoken'); //토큰 생성을 위함
const SECRET_KEY = 'test';

app.use(cors());
app.use(express.json()); //JSON 본문 파싱 미들웨어



//1. mysql 연결 정보 셋팅
const connection = mysql.createConnection({
  host:'database:3306',
  user:'root',
  password:'1234',
  database:'database'
});

//2. MYSQL DB접속시 오류가 나면 에러 출력하기, 성공하면 '성공'표시하기
connection.connect((err)=>{
  if(err){
    console.log('MYSQL연결 실패 : ', err);
    return;
  }
  console.log('MYSQL연결 성공');
});

//3. 로그인 폼에서 post방식으로 전달받은 데이터를 DB에 조회하여 결과값을 리턴함.
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  connection.query(
    'SELECT * FROM users WHERE username = ?',[username],async (err, results) => {
      if (err || results.length === 0) {
        return res.status(401).json({ error: '아이디 또는 비밀번호가 틀립니다.' });
      }

      const user = results[0];

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: '아이디 또는 비밀번호가 틀립니다.' });
      }

      //토큰 생성(1시간)
      const token = jwt.sign({ id: user.id, username: user.username },SECRET_KEY,{ expiresIn: '1h' });

      //토큰 발급
      res.json({ token });
    });
});

//4. Resister.js에서 넘겨 받은 username, password를 sql db에 입력하여 추가한다.
app.post('/register', async(req, res)=>{
  const {username, password} = req.body;
  const hash = await bcrypt.hash(password, 10); //패스워드 hash암호화

  connection.query(
    'INSERT INTO users (username, password) VALUES (?, ?)', [username, hash],
    (err) => {
      if(err){
        if(err.code == 'ER_DUP_ENTRY'){
          return res.status(400).json({error:'이미 존재하는 아이디 입니다.'});
        }
        return res.status(500).json({error:'회원가입 실패'});
      }
      res.json({success:true});
    }
  );
});


//3.-2 로그인2  (Login2.js에서 POST로 호출)
app.post('/login2', (req, res) => {
  const { username, password } = req.body;

  // users2 테이블에서 아이디를 조회
  connection.query(
    'SELECT * FROM users2 WHERE username = ?',
    [username],
    async (err, results) => {
      if (err || results.length === 0) {
        return res.status(401).json({ error: '아이디 또는 비밀번호가 틀립니다.' });
      }

      const user = results[0];

      // bcrypt 해시 비교
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: '아이디 또는 비밀번호가 틀립니다.' });
      }

      // 토큰 생성(1시간 유효)
      const token = jwt.sign(
        { id: user.id, username: user.username },
        SECRET_KEY,
        { expiresIn: '1h' }
      );
      res.json({ token });
    }
  );
});

//4.-2 Register2.js에서 넘겨받은 데이터(users2 테이블 INSERT)
app.post('/register2', async (req, res) => {
  const { username, password, email, tel } = req.body;
  const hash = await bcrypt.hash(password, 10);       // 비밀번호 해시

  connection.query(
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


//방법1. db연결 테스트 - 메세지만 확인하기 위함
// app.get('/', (req,res)=>{
//   //특정 경로로 요청된 정보를 처리
//   res.json('Excused from Backend');
// });

//방법2. SQL쿼리문을 사용하여 DB에서 조회된 데이터를 출력한다.(Read)

//1. 상품목록 조회하기
//상품목록은 상품코드(g_code), 상품명(g_name), 상품가격(g_cost)으로 구성되어 있다.
app.get('/goods', (req,res)=>{
  //이건 기본이다. 기본은 오름차순이다.
  //connection.query("SELECT * FROM goods", (err, results)=>{

  //상품코드(g_code) 기준으로 내림차순 정렬. 게시판은 방금 쓴 글이 앞에 나와야 되기 때문에 내림차순으로 정렬한다.
  connection.query("SELECT * FROM goods ORDER BY g_code DESC", (err, results)=>{
    if(err){
      console.log('쿼리문 오류 : ', err);
      res.status(500).json({error: 'DB쿼리 오류'});
      return;
    }
    res.json(results);
  })
});

//2. 상품삭제(DELETE)
//상품삭제는 상품코드(g_code)를 기준으로 삭제한다.
app.delete('/goods/:g_code', (req, res) => {
  const g_code = req.params.g_code;
  connection.query(
    'DELETE FROM goods WHERE g_code = ?',
    [g_code],
    (err, result) => {
      if (err) {
        console.log('삭제 오류:', err);
        res.status(500).json({ error: '상품 삭제 실패' });
        return;
      }
      res.json({ success: true });
    }
  );
});

//3. 상품수정 (UPDATE)
//상품수정은 상품코드(g_code)를 기준으로 수정한다.
app.put('/goods/update/:g_code', (req, res)=>{
  const g_code = req.params.g_code;
  const {g_name, g_cost} = req.body;

  //update쿼리문 작성하여 실행
  connection.query(
    'UPDATE goods SET g_name = ?, g_cost= ? where g_code= ?', [g_name, g_cost, g_code],
    (err, result) => {
      if(err){
        console.log('수정 오류 : ', err);
        res.status(500).json({error : '상품 수정하기 실패'});
        return;
      }
      res.json({success:true});
    }
  );
});

//4. 특정상품 조회하기(UPDATE)
// 특정 상품 조회 (GET /goods/:g_code)
app.get('/goods/:g_code', (req, res) => {
  const g_code = req.params.g_code;

  connection.query(
    'SELECT * FROM goods WHERE g_code = ?',
    [g_code],
    (err, results) => {
      if (err) {
        console.log('조회 오류:', err);
        res.status(500).json({ error: '상품 조회 실패' });
        return;
      }

      if (results.length === 0) {
        res.status(404).json({ error: '해당 상품이 없습니다.' });
        return;
      }

      res.json(results[0]); // 단일 객체만 반환
    }
  );
});


//5. 상품 등록하기(create, insert into)
//post방식으로 /goods받음
app.post('/goods', (req, res) => {
  const { g_name, g_cost } = req.body;
  if(!g_name || !g_cost) {
    return res.status(400).json({ error: '필수 항목이 누락되었습니다. 다시 확인하세요.' });
  }
  
  connection.query(
    'INSERT INTO goods (g_name, g_cost) VALUES (?, ?)',
    [g_name, g_cost],
    (err, result) => {
      if (err) {
        console.log('DB등록 실패:', err);
        res.status(500).json({ error: '상품 등록 실패' });
        return;
      }
      res.json({ success: true, insertId: result.insertId });
    }
  );
});


// ***********여기까지 goods데이터*************

// ***********여기부터 books데이터*************

// 1. 도서목록 조회하기 (Read)
app.get('/books', (req,res)=>{
  connection.query(
    "SELECT * FROM book_store",
    (err, results)=>{
      if(err){
        console.log('쿼리문 오류(book 조회) : ', err);
        res.status(500).json({error: 'DB쿼리 오류'});
        return;
      }
      res.json(results);
    }
  );
});

// 2. 도서등록하기 (Create, insert into)
app.post('/books', (req, res) => {
  const { name, area1, area2, area3, BOOK_CNT, owner_nm, tel_num } = req.body;
  if(!name || !BOOK_CNT){
    return res.status(400).json({ error: '필수 항목이 누락되었습니다. 다시 확인하세요.' });
  }
  connection.query(
    'INSERT INTO book_store (name, area1, area2, area3, BOOK_CNT, owner_nm, tel_num) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, area1, area2, area3, BOOK_CNT, owner_nm, tel_num],
    (err, result) => {
      if (err) {
        console.log('DB등록 실패(book) :', err);
        res.status(500).json({ error: '도서 등록 실패' });
        return;
      }
      res.json({ success: true, insertId: result.insertId });
    }
  );
});

// 3. 특정 도서 조회하기 (GET /books/:num)
app.get('/books/:num', (req, res) => {
  const num = req.params.num;
  connection.query(
    'SELECT * FROM book_store WHERE num = ?',
    [num],
    (err, results) => {
      if (err) {
        console.log('조회 오류(book 상세) :', err);
        res.status(500).json({ error: '도서 조회 실패' });
        return;
      }
      if (results.length === 0) {
        res.status(404).json({ error: '해당 도서가 없습니다.' });
        return;
      }
      res.json(results[0]); // 단일 객체만 반환
    }
  );
});

// 4. 도서삭제 (DELETE)
app.delete('/books/:num', (req, res) => {
  const num = req.params.num;
  connection.query(
    'DELETE FROM book_store WHERE num = ?',
    [num],
    (err, result) => {
      if (err) {
        console.log('삭제 오류(book) :', err);
        res.status(500).json({ error: '도서 삭제 실패' });
        return;
      }
      res.json({ success: true });
    }
  );
});

// 5. 도서수정 (UPDATE)
app.put('/books/update/:num', (req, res) => {
  const num = req.params.num;
  const { name, area1, area2, area3, BOOK_CNT, owner_nm, tel_num } = req.body;
  connection.query(
    'UPDATE book_store SET name = ?, area1 = ?, area2 = ?, area3 = ?, BOOK_CNT = ?, owner_nm = ?, tel_num = ? WHERE num = ?',
    [name, area1, area2, area3, BOOK_CNT, owner_nm, tel_num, num],
    (err, result) => {
      if (err) {
        console.log('수정 오류(book) :', err);
        res.status(500).json({ error: '도서 수정 실패' });
        return;
      }
      res.json({ success: true });
    }
  );
});


// ***********여기까지 books데이터*************

// ***********여기부터fruits데이터*************

// 1. 상품 조회하기
app.get('/fruits', (req,res)=>{
  connection.query(
    "SELECT * FROM fruit ORDER BY num DESC",
    (err, results)=>{
      if(err){
        console.log('쿼리문 오류(book 조회) : ', err);
        res.status(500).json({error: 'DB쿼리 오류'});
        return;
      }
      res.json(results);
    });
});


//2. 상품 등록하기
app.post('/fruits', (req,res)=>{
  // 객체 비구조화 할당을 사용해야 합니다
  const { name, price, color, country } = req.body;
  if(!name || !price ||!color || !country) {
    return res.status(400).json({erro: '필수 항목이 누락되었습니다. 다시 확인하세요.'});
  }

  //쿼리문 실행
  connection.query(
    'INSERT INTO fruit (name, price, color, country) VALUES (?, ?, ?, ?)',
  [name, price, color, country],
  (err, result) => {
      if (err) {
        console.log('등록 오류 :', err);
        res.status(500).json({ error: '상품 등록 실패' });
        return;
      }
      res.json({ success: true, insertId: result.insertId });
    }
  );
});

// 3. 특정 과일 조회하기 (GET /fruits/:num)
app.get('/fruits/:num', (req, res) => {
  const num = req.params.num;
  connection.query(
    'SELECT * FROM fruit WHERE num = ?',
    [num],
    (err, results) => {
      if (err) {
        console.log('조회 오류(fruit 상세) :', err);
        res.status(500).json({ error: '과일 조회 실패' });
        return;
      }
      if (results.length === 0) {
        res.status(404).json({ error: '해당 과일이 없습니다.' });
        return;
      }
      res.json(results[0]); // 단일 객체만 반환
    }
  );
});

// 4. 과일 삭제하기 (DELETE /fruits/:num)
app.delete('/fruits/:num', (req, res) => {
  const num = req.params.num;
  connection.query(
    'DELETE FROM fruit WHERE num = ?',
    [num],
    (err, result) => {
      if (err) {
        console.log('삭제 오류(fruit) :', err);
        res.status(500).json({ error: '과일 삭제 실패' });
        return;
      }
      res.json({ success: true });
    }
  );
});

// 5. 과일 수정하기 (UPDATE /fruits/update/:num)
app.put('/fruits/update/:num', (req, res) => {
  const num = req.params.num;
  const { name, price, color, country } = req.body;
  if (!name || !price || !color || !country) {
    return res.status(400).json({ error: '필수 항목이 누락되었습니다. 다시 확인하세요.' });
  }
  connection.query(
    'UPDATE fruit SET name = ?, price = ?, color = ?, country = ? WHERE num = ?',
    [name, price, color, country, num],
    (err, result) => {
      if (err) {
        console.log('수정 오류(fruit) :', err);
        res.status(500).json({ error: '과일 수정 실패' });
        return;
      }
      res.json({ success: true });
    }
  );
});

// ***********여기까지 fruits데이터*************

// ***********여기부터 question데이터*************

//6. question 등록하기
app.post('/question', (req, res)=>{
  const {name, tel, email, txtbox} = req.body;
  if(!name||!tel||!email||!txtbox){
    return res.status(400).json({error:'필수 항목이 누락되었습니다. 다시 확인하세요'});
  }
  //변수에 저장된 데이터를 sql쿼리문으로 DB에 연결함 
  connection.query(
    'INSERT INTO question (name, tel, email, txtbox) VALUES (?, ?, ?, ?)',
    [name, tel, email, txtbox],
    (err, result) => {
      if (err) {
        console.log('등록 오류:', err);
        res.status(500).json({error: '데이터 입력 오류'});
        return;
      }
      res.send('질문 등록 완료');
    }
  )
});


// ***********여기까지 question데이터*************

// ***********여기부터 login데이터*************



//***********서버 실행 ************
//서버실행
app.listen(port, ()=>{
  console.log('Listening...');
});


