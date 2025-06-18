```js
/**
 * ================================
 *  공통 설정: Express + 미들웨어
 * ================================
 */
const express    = require('express');      // Express 기본 라우팅
const app        = express();               // Express 인스턴스 생성
const port       = 9070;                    // 사용할 포트 (kdt/지니펫/greenmarket 공통)
const cors       = require('cors');         // CORS 허용 미들웨어
const mysql      = require('mysql');        // MySQL 연결 라이브러리
const bcrypt     = require('bcrypt');       // bcrypt 해시 암호화
const jwt        = require('jsonwebtoken'); // JWT 생성/검증
const SECRET_KEY = 'test';                  // JWT 서명용 비밀 키 (예시)

// CORS 및 JSON 파싱
app.use(cors());
app.use(express.json());

/**
 * ======================================
 * uploads 폴더 자동 생성 & 정적 제공
 * ======================================
 */
const fs   = require('fs');
const path = require('path');

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

/**
 * ======================================
 * Multer 설정 (상품 이미지 업로드)
 * ======================================
 */
const multer  = require('multer');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage }).fields([
  { name: 'image_main', maxCount: 1 },
  { name: 'image_1',     maxCount: 1 },
  { name: 'image_2',     maxCount: 1 },
  { name: 'image_3',     maxCount: 1 },
  { name: 'image_4',     maxCount: 1 },
  { name: 'image_5',     maxCount: 1 },
  { name: 'image_6',     maxCount: 1 }
]);

/**
 * ======================================
 * 1. MySQL 연결 정보 (kdt 데이터베이스)
 * ======================================
 */
const connectionKdt = mysql.createConnection({
  host: 'database',
  user: 'root',
  password: '1234',
  database: 'kdt'
});
connectionKdt.connect(err => {
  if (err) console.log('MYSQL(kdt) 연결 실패:', err);
  else     console.log('MYSQL(kdt) 연결 성공');
});

/**
 * ======================================
 * 2. MySQL 연결 정보 분리
 *    - Ginipet 전용
 *    - GreenMarket 전용
 * ======================================
 */
// 2-1. Ginipet 전용 (ginipet_users 테이블)
const connectionGinipet = mysql.createConnection({
  host: 'database',
  user: 'root',
  password: '1234',
  database: 'ginipet'
});
connectionGinipet.connect(err => {
  if (err) console.log('MYSQL(ginipet) 연결 실패:', err);
  else     console.log('MYSQL(ginipet) 연결 성공');
});

// 2-2. GreenMarket 전용 (green_users, green_products, green_cart)
const connectionGM = mysql.createConnection({
  host: 'database',
  user: 'root',
  password: '1234',
  database: 'greenmarket'
});
connectionGM.connect(err => {
  if (err) console.log('MYSQL(greenmarket) 연결 실패:', err);
  else     console.log('MYSQL(greenmarket) 연결 성공');
});

/**
 * ======================================
 * 3. 기존 kdt 프로젝트용 라우트
 * ======================================
 */
// 3-1. 로그인 (users 테이블)
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  connectionKdt.query(
    'SELECT * FROM users WHERE username = ?',
    [username],
    async (err, results) => {
      if (err || results.length === 0)
        return res.status(401).json({ error: '아이디 또는 비밀번호가 틀립니다.' });
      const user = results[0];
      const match = await bcrypt.compare(password, user.password);
      if (!match)
        return res.status(401).json({ error: '아이디 또는 비밀번호가 틀립니다.' });
      const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '1h' });
      res.json({ token });
    }
  );
});

// 3-2. 회원가입 (users 테이블)
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  connectionKdt.query(
    'INSERT INTO users (username, password) VALUES (?, ?)',
    [username, hash],
    err => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY')
          return res.status(400).json({ error: '이미 존재하는 아이디입니다.' });
        return res.status(500).json({ error: '회원가입 실패' });
      }
      res.json({ success: true });
    }
  );
});

// 3-3. 로그인2 (users2 테이블)
app.post('/login2', (req, res) => {
  const { username, password } = req.body;
  connectionKdt.query(
    'SELECT * FROM users2 WHERE username = ?',
    [username],
    async (err, results) => {
      if (err || results.length === 0)
        return res.status(401).json({ error: '아이디 또는 비밀번호가 틀립니다.' });
      const user = results[0];
      const match = await bcrypt.compare(password, user.password);
      if (!match)
        return res.status(401).json({ error: '아이디 또는 비밀번호가 틀립니다.' });
      const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '1h' });
      res.json({ token });
    }
  );
});

// 3-4. 회원가입2 (users2 테이블)
app.post('/register2', async (req, res) => {
  const { username, password, email, tel } = req.body;
  const hash = await bcrypt.hash(password, 10);
  connectionKdt.query(
    'INSERT INTO users2 (username, password, email, tel) VALUES (?, ?, ?, ?)',
    [username, hash, email, tel],
    err => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY')
          return res.status(400).json({ error: '이미 존재하는 아이디입니다.' });
        return res.status(500).json({ error: '회원가입 실패' });
      }
      res.json({ success: true });
    }
  );
});

// 3-5. 상품목록 조회 (goods 테이블)
app.get('/goods', (req, res) => {
  connectionKdt.query(
    'SELECT * FROM goods ORDER BY g_codeDESC',
    (err, results) => {
      if (err) {
        console.log('goods 조회 오류:', err);
        return res.status(500).json({ error: 'DB쿼리 오류' });
      }
      res.json(results);
    }
  );
});

// 3-6. 상품삭제 (DELETE /goods/:g_code)
app.delete('/goods/:g_code', (req, res) => {
  const g_code = req.params.g_code;
  connectionKdt.query(
    'DELETE FROM goods WHERE g_code = ?',
    [g_code],
    (err) => {
      if (err) {
        console.log('goods 삭제 오류:', err);
        return res.status(500).json({ error: '상품 삭제 실패' });
      }
      res.json({ success: true });
    }
  );
});

// 3-7. 상품수정 (UPDATE /goods/update/:g_code)
app.put('/goods/update/:g_code', (req, res) => {
  const g_code = req.params.g_code;
  const { g_name, g_cost } = req.body;
  connectionKdt.query(
    'UPDATE goods SET g_name=?, g_cost=? WHERE g_code=?',
    [g_name, g_cost, g_code],
    err => {
      if (err) {
        console.log('goods 수정 오류:', err);
        return res.status(500).json({ error: '상품 수정 실패'});
      }
      res.json({ success: true });
    }
  );
});

// 3-8. 특정상품 조회 (GET /goods/:g_code)
app.get('/goods/:g_code', (req, res) => {
  const g_code = req.params.g_code;
  connectionKdt.query(
    'SELECT * FROM goods WHERE g_code=?',
    [g_code],
    (err, results) => {
      if (err) {
        console.log('goods 상세조회 오류:', err);
        return res.status(500).json({ error:'상품 조회 실패' });
      }
      if (!results.length) return res.status(404).json({ error: '해당 상품이 없습니다.' });
      res.json(results[0]);
    }
  );
});

// 3-9. 상품 등록 (POST /goods)
app.post('/goods', (req, res) => {
  const { g_name, g_cost } = req.body;
  if (!g_name || !g_cost)
    return res.status(400).json({ error:'필수 항목이 누락되었습니다.' });
  connectionKdt.query(
    'INSERT INTO goods(g_name,g_cost) VALUES(?,?)',
    [g_name, g_cost],
    (err, result) => {
      if (err) {
        console.log('goods 등록 오류:', err);
        return res.status(500).json({ error:'상품 등록 실패' });
      }
      res.json({success:true, insertId: result.insertId});
    }
  );
});

/**
 * ======================================
 * 4. Ginipet 전용 라우트
 * ======================================
 */
// 4-1. 지니펫 회원가입
app.post('/ginipet/register', async (req, res) => {
  const { username, password, tel, email } = req.body;
  const hash = await bcrypt.hash(password, 10);
  connectionGinipet.query(
    'INSERT INTO ginipet_users(username,password,tel,email) VALUES(?,?,?,?)',
    [username,hash,tel,email],
    err => {
      if(err){
        if(err.code==='ER_DUP_ENTRY') return res.status(400).json({error:'이미 존재하는 아이디입니다.'});
        return res.status(500).json({error:'회원가입 실패'});
      }
      res.json({success:true});
    }
  );
});

// 4-2. 지니펫 로그인
app.post('/ginipet/login', (req, res) => {
  const { username,password } = req.body;
  connectionGinipet.query(
    'SELECT * FROM ginipet_users WHERE username=?',
    [username],
    async (err,results) => {
      if(err||!results.length)
        return res.status(401).json({error:'아이디 또는 비밀번호가 틀렸습니다.'});
      const user=results[0];
      const match=await bcrypt.compare(password,user.password);
      if(!match) return res.status(401).json({error:'아이디 또는 비밀번호가 틀립니다.'});
      const token=jwt.sign({id:user.id, username:user.username},SECRET_KEY,{expiresIn:'1h'});
      res.json({token});
    }
  );
});

// 4-3. 예시 GET /ginipet/join
app.get('/ginipet/join',(req,res)=>{res.json('Excused from ginipet backend');});

/**
 * ======================================
 * 5. GreenMarket 전용 라우트
 * ======================================
 */
// JWT 인증 미들웨어
function authenticateToken(req,res,next){
  const authHeader=req.headers.authorization;
  const token=authHeader&&authHeader.split(' ')[1];
  if(!token)return res.status(401).json({message:'토큰 없음'});
  jwt.verify(token,SECRET_KEY,(err,user)=>{
    if(err) return res.status(401).json({message:'유효하지 않은 토큰입니다.'});
    req.user=user;next();
  });
}

// 5-1. 회원가입 (green_users 테이블)
app.post('/api/register',async(req,res)=>{
  const {userid,username,password,phone,email,region}=req.body;
  try{
    const hash=await bcrypt.hash(password,10);
    const sql=`INSERT INTO green_users(userid,username,password,phone,email,region) VALUES(?,?,?,?,?,?)`;
    connectionGM.query(sql,[userid,username,hash,phone,email,region],err=>{
      if(err){
        if(err.code==='ER_DUP_ENTRY') return res.status(400).json({error:'이미 존재하는 아이디 또는 이메일입니다.'});
        return res.status(500).json({error:'회원가입 실패'});
      }
      res.json({success:true});
    });
  }catch{res.status(500).json({error:'서버 오류'});}  
});

// 5-2. 로그인 (green_users 테이블)
app.post('/api/login',(req,res)=>{
  const {userid,password}=req.body;
  connectionGM.query('SELECT * FROM green_users WHERE userid=?',[userid],async(err,results)=>{
    if(err) return res.status(500).json({error:'DB 오류'});
    if(!results.length) return res.status(400).json({error:'아이디 또는 비밀번호가 잘못되었습니다.'});
    const user=results[0];
    const match=await bcrypt.compare(password,user.password);
    if(!match) return res.status(401).json({error:'아이디 또는 비밀번호가 잘못되었습니다.'});
    const now=new Date();
    connectionGM.query('UPDATE green_users SET last_login=? WHERE id=?',[now,user.id]);
    const token=jwt.sign({id:user.id,userid:user.userid},SECRET_KEY,{expiresIn:'1h'});
    res.json({success:true,token,last_login:now});
  });
});

// 5-3. 상품 등록 (green_products + 이미지)
app.post('/api/products',authenticateToken,upload,(req,res)=>{
  const b=req.body;
  const img=key=>req.files?.[key]?.[0]?.filename||null;
  const params=[req.user.id,b.title,b.brand,b.kind,b.condition,b.price,b.trade_type,b.region,b.description,b.shipping_fee||0,img('image_main'),img('image_1'),img('image_2'),img('image_3'),img('image_4'),img('image_5'),img('image_6')];
  const sql=`INSERT INTO green_products(owner_id,title,brand,kind,\`condition\`,price,trade_type,region,description,shipping_fee,image_main,image_1,image_2,image_3,image_4,image_5,image_6) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
  connectionGM.query(sql,params,(err,result)=>{
    if(err){console.error('상품 등록 오류:',err);return res.status(500).json({error:'상품 등록 실패'});} 
    res.json({success:true,id:result.insertId});
  });
});

// 5-4. 상품 목록 조회
app.get('/api/products',(req,res)=>{
  connectionGM.query('SELECT * FROM green_products ORDER BY id DESC',(err,rows)=>{if(err)return res.status(500).json({error:'조회 실패'});const products=rows.map(r=>({id:r.id,title:r.title,brand:r.brand,kind:r.kind,condition:r.condition,price:r.price,trade_type:r.trade_type,region:r.region,description:r.description,datetime:r.datetime,images:[r.image_main,r.image_1,r.image_2,r.image_3,r.image_4,r.image_5,r.image_6].filter(v=>v)}));res.json(products);});
});

// 5-5. 상품 상세 조회
app.get('/api/products/:id',(req,res)=>{
  const sql=`SELECT p.*,u.username AS seller_name,(SELECT COUNT(*) FROM green_products WHERE owner_id=p.owner_id) AS seller_product_count FROM green_products p JOIN green_users u ON p.owner_id=u.id WHERE p.id=?`;
  connectionGM.query(sql,[req.params.id],(err,result)=>{if(err)return res.status(500).json({error:'DB 오류'});if(!result.length)return res.status(404).json({error:'상품 없음'});res.json(result[0]);});
});

// 5-6. 장바구니 조회
app.get('/api/cart',authenticateToken,(req,res)=>{
  const sql=`SELECT cart_id AS id,product_id,title,brand,kind,\`condition\`,price,shipping_fee,trade_type,region,image_main,added_at FROM green_cart WHERE user_id=?`;
  connectionGM.query(sql,[req.user.id],(err,rows)=>{if(err)return res.status(500).json({error:'DB 오류'});res.json(rows);});
});

// 5-7. 장바구니 삭제
app.delete('/api/cart',authenticateToken,(req,res)=>{
  const ids=req.body.ids;
  if(!Array.isArray(ids)||!ids.length) return res.status(400).json({error:'삭제할 ID 필요'});
  const placeholders=ids.map(()=>'?').join(',');
  const sql=`DELETE FROM green_cart WHERE user_id=? AND cart_id IN (${placeholders})`;
  connectionGM.query(sql,[req.user.id,...ids],(err,result)=>{if(err)return res.status(500).json({error:'삭제 실패'});res.json({success:true,affectedRows:result.affectedRows});});
});

// 5-8. 장바구니추가
app.post('/api/cart',authenticateToken,(req,res)=>{
  const {product_id}=req.body;
  const check=`SELECT * FROM green_cart WHERE user_id=? AND product_id=?`;
  connectionGM.query(check,[req.user.id,product_id],(err,chk)=>{
    if(err) return res.status(500).json({error:'DB 오류'});
    if(chk.length) return res.status(400).json({error:'이미 장바구니에 있습니다.'});
    connectionGM.query('SELECT title,brand,kind,\`condition\`,price,trade_type,region,image_main,shipping_fee FROM green_products WHERE id=?',[product_id],(err,pres)=>{
      if(err) return res.status(500).json({error:'상품 조회 오류'});
      if(!pres.length) return res.status(404).json({error:'상품 없음'});
      const p=pres[0];
      const insert=`INSERT INTO green_cart(user_id,product_id,title,brand,kind,\`condition\`,shipping_fee,price,trade_type,region,image_main,added_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,NOW())`;
      const params2=[req.user.id,product_id,p.title,p.brand,p.kind,p.condition,p.shipping_fee,p.price,p.trade_type,p.region,p.image_main];
      connectionGM.query(insert,params2,err=>{if(err) return res.status(500).json({error:'장바구니 추가 실패'});res.json({message:'장바구니에 상품이 추가되었습니다.'});});
    });
  });
});

/**
 * ======================================
 * 6. 서버 실행
 * ======================================
 */
app.listen(port,()=>{
  console.log(`서버 실행 중… 포트: ${port}`);
});
```
