import os
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from models import db, User, Team, WeeklyReport, Reminder
from functools import wraps
from sqlalchemy import func, and_

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-change-in-production'
app.config['JWT_SECRET_KEY'] = 'your-jwt-secret-key-change-in-production'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///weekly.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

CORS(app)
jwt = JWTManager(app)
db.init_app(app)

def admin_required(f):
    @wraps(f)
    @jwt_required()
    def decorated(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if user.role != 'admin':
            return jsonify({"msg": "权限不足"}), 403
        return f(*args, **kwargs)
    return decorated

def manager_required(f):
    @wraps(f)
    @jwt_required()
    def decorated(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if user.role not in ['admin', 'manager']:
            return jsonify({"msg": "权限不足"}), 403
        return f(*args, **kwargs)
    return decorated

def get_current_week():
    today = datetime.now()
    year = today.isocalendar()[0]
    week = today.isocalendar()[1]
    return f"{year}W{week:02d}"

def get_week_range(year, week):
    start = datetime.fromisocalendar(year, week, 1)
    end = start + timedelta(days=6)
    return start, end

def parse_week(week_str):
    year = int(week_str[:4])
    week = int(week_str[5:])
    return year, week

@app.route('/api/register', methods=['POST'])
@admin_required
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    real_name = data.get('real_name')
    role = data.get('role', 'member')
    team_id = data.get('team_id')

    if not username or not password or not real_name:
        return jsonify({"msg": "缺少必要信息"}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"msg": "用户名已存在"}), 400

    if role not in ['admin', 'manager', 'member']:
        return jsonify({"msg": "无效的角色"}), 400

    if team_id:
        team = Team.query.get(team_id)
        if not team:
            return jsonify({"msg": "团队不存在"}), 400

    user = User(
        username=username,
        real_name=real_name,
        role=role,
        team_id=team_id
    )
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    return jsonify({
        "id": user.id,
        "username": user.username,
        "real_name": user.real_name,
        "role": user.role,
        "team_id": user.team_id
    }), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()

    if not user or not user.check_password(password):
        return jsonify({"msg": "用户名或密码错误"}), 401

    access_token = create_access_token(identity=user.id)
    return jsonify({
        "access_token": access_token,
        "user": {
            "id": user.id,
            "username": user.username,
            "real_name": user.real_name,
            "role": user.role,
            "team_id": user.team_id,
            "team_name": user.team.name if user.team else None
        }
    })

@app.route('/api/profile', methods=['GET'])
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    return jsonify({
        "id": user.id,
        "username": user.username,
        "real_name": user.real_name,
        "role": user.role,
        "team_id": user.team_id,
        "team_name": user.team.name if user.team else None
    })

@app.route('/api/teams', methods=['GET'])
@jwt_required()
def get_teams():
    teams = Team.query.all()
    return jsonify([{
        "id": t.id,
        "name": t.name,
        "description": t.description,
        "member_count": t.members.count()
    } for t in teams])

@app.route('/api/teams', methods=['POST'])
@admin_required
def create_team():
    data = request.get_json()
    name = data.get('name')
    description = data.get('description', '')

    if not name:
        return jsonify({"msg": "团队名称不能为空"}), 400

    if Team.query.filter_by(name=name).first():
        return jsonify({"msg": "团队名称已存在"}), 400

    team = Team(name=name, description=description)
    db.session.add(team)
    db.session.commit()

    return jsonify({
        "id": team.id,
        "name": team.name,
        "description": team.description
    }), 201

@app.route('/api/teams/<int:team_id>', methods=['PUT'])
@admin_required
def update_team(team_id):
    team = Team.query.get(team_id)
    if not team:
        return jsonify({"msg": "团队不存在"}), 404

    data = request.get_json()
    name = data.get('name')
    description = data.get('description')

    if name and name != team.name:
        if Team.query.filter_by(name=name).first():
            return jsonify({"msg": "团队名称已存在"}), 400
        team.name = name

    if description is not None:
        team.description = description

    db.session.commit()
    return jsonify({
        "id": team.id,
        "name": team.name,
        "description": team.description
    })

@app.route('/api/teams/<int:team_id>', methods=['DELETE'])
@admin_required
def delete_team(team_id):
    team = Team.query.get(team_id)
    if not team:
        return jsonify({"msg": "团队不存在"}), 404

    if team.members.count() > 0:
        return jsonify({"msg": "团队中还有成员，无法删除"}), 400

    db.session.delete(team)
    db.session.commit()
    return jsonify({"msg": "团队已删除"})

@app.route('/api/users', methods=['GET'])
@manager_required
def get_users():
    team_id = request.args.get('team_id', type=int)
    role = request.args.get('role')
    
    query = User.query.filter(User.role != 'admin')
    
    if team_id:
        query = query.filter_by(team_id=team_id)
    if role:
        query = query.filter_by(role=role)
    
    users = query.all()
    
    return jsonify([{
        "id": u.id,
        "username": u.username,
        "real_name": u.real_name,
        "role": u.role,
        "team_id": u.team_id,
        "team_name": u.team.name if u.team else None
    } for u in users])

@app.route('/api/users/<int:user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"msg": "用户不存在"}), 404

    data = request.get_json()
    real_name = data.get('real_name')
    role = data.get('role')
    team_id = data.get('team_id')
    password = data.get('password')

    if real_name:
        user.real_name = real_name
    if role and role in ['admin', 'manager', 'member']:
        user.role = role
    if team_id is not None:
        if team_id == 0:
            user.team_id = None
        else:
            team = Team.query.get(team_id)
            if team:
                user.team_id = team_id
    if password:
        user.set_password(password)

    db.session.commit()
    return jsonify({
        "id": user.id,
        "username": user.username,
        "real_name": user.real_name,
        "role": user.role,
        "team_id": user.team_id
    })

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"msg": "用户不存在"}), 404

    db.session.delete(user)
    db.session.commit()
    return jsonify({"msg": "用户已删除"})

@app.route('/api/reports/my', methods=['GET'])
@jwt_required()
def get_my_reports():
    user_id = get_jwt_identity()
    week = request.args.get('week')
    
    query = WeeklyReport.query.filter_by(user_id=user_id)
    
    if week:
        query = query.filter_by(week=week)
    
    reports = query.order_by(WeeklyReport.week.desc()).all()
    
    return jsonify([{
        "id": r.id,
        "week": r.week,
        "content": r.content,
        "status": r.status,
        "submitted_at": r.submitted_at.isoformat() if r.submitted_at else None,
        "returned_at": r.returned_at.isoformat() if r.returned_at else None,
        "return_reason": r.return_reason,
        "can_edit": r.status in ['draft', 'returned']
    } for r in reports])

@app.route('/api/reports/my/<week>', methods=['GET'])
@jwt_required()
def get_my_week_report(week):
    user_id = get_jwt_identity()
    report = WeeklyReport.query.filter_by(user_id=user_id, week=week).first()
    
    if report:
        return jsonify({
            "id": report.id,
            "week": report.week,
            "content": report.content,
            "status": report.status,
            "submitted_at": report.submitted_at.isoformat() if report.submitted_at else None,
            "returned_at": report.returned_at.isoformat() if report.returned_at else None,
            "return_reason": report.return_reason,
            "can_edit": report.status in ['draft', 'returned']
        })
    else:
        return jsonify({
            "week": week,
            "content": "",
            "status": "draft",
            "can_edit": True
        })

@app.route('/api/reports', methods=['POST'])
@jwt_required()
def create_report():
    user_id = get_jwt_identity()
    data = request.get_json()
    week = data.get('week')
    content = data.get('content', '')
    submit = data.get('submit', False)

    if not week:
        week = get_current_week()

    existing = WeeklyReport.query.filter_by(user_id=user_id, week=week).first()
    
    if existing:
        if existing.status == 'submitted':
            return jsonify({"msg": "周报已提交，无法修改"}), 400
        existing.content = content
        existing.updated_at = datetime.utcnow()
        if submit:
            existing.status = 'submitted'
            existing.submitted_at = datetime.utcnow()
        db.session.commit()
        report = existing
    else:
        report = WeeklyReport(
            user_id=user_id,
            week=week,
            content=content,
            status='submitted' if submit else 'draft'
        )
        if submit:
            report.submitted_at = datetime.utcnow()
        db.session.add(report)
        db.session.commit()

    return jsonify({
        "id": report.id,
        "week": report.week,
        "content": report.content,
        "status": report.status,
        "submitted_at": report.submitted_at.isoformat() if report.submitted_at else None
    })

@app.route('/api/reports/all', methods=['GET'])
@manager_required
def get_all_reports():
    week = request.args.get('week')
    user_id = request.args.get('user_id', type=int)
    team_id = request.args.get('team_id', type=int)
    status = request.args.get('status')
    
    query = WeeklyReport.query.join(User, WeeklyReport.user_id == User.id)
    
    if week:
        query = query.filter(WeeklyReport.week == week)
    if user_id:
        query = query.filter(WeeklyReport.user_id == user_id)
    if team_id:
        query = query.filter(User.team_id == team_id)
    if status:
        query = query.filter(WeeklyReport.status == status)
    
    reports = query.order_by(WeeklyReport.week.desc(), WeeklyReport.submitted_at.desc()).all()
    
    return jsonify([{
        "id": r.id,
        "week": r.week,
        "content": r.content,
        "status": r.status,
        "submitted_at": r.submitted_at.isoformat() if r.submitted_at else None,
        "returned_at": r.returned_at.isoformat() if r.returned_at else None,
        "return_reason": r.return_reason,
        "user": {
            "id": r.author.id,
            "username": r.author.username,
            "real_name": r.author.real_name,
            "team_name": r.author.team.name if r.author.team else None
        }
    } for r in reports])

@app.route('/api/reports/<int:report_id>', methods=['GET'])
@jwt_required()
def get_report(report_id):
    user_id = get_jwt_identity()
    current_user = User.query.get(user_id)
    report = WeeklyReport.query.get(report_id)
    
    if not report:
        return jsonify({"msg": "周报不存在"}), 404
    
    if current_user.role == 'member' and report.user_id != user_id:
        return jsonify({"msg": "权限不足"}), 403
    
    return jsonify({
        "id": report.id,
        "week": report.week,
        "content": report.content,
        "status": report.status,
        "submitted_at": report.submitted_at.isoformat() if report.submitted_at else None,
        "returned_at": report.returned_at.isoformat() if report.returned_at else None,
        "return_reason": report.return_reason,
        "user": {
            "id": report.author.id,
            "username": report.author.username,
            "real_name": report.author.real_name,
            "team_name": report.author.team.name if report.author.team else None
        }
    })

@app.route('/api/reports/<int:report_id>/return', methods=['POST'])
@manager_required
def return_report(report_id):
    report = WeeklyReport.query.get(report_id)
    
    if not report:
        return jsonify({"msg": "周报不存在"}), 404
    
    if report.status != 'submitted':
        return jsonify({"msg": "只能退回已提交的周报"}), 400
    
    data = request.get_json()
    reason = data.get('reason', '')
    
    report.status = 'returned'
    report.returned_at = datetime.utcnow()
    report.return_reason = reason
    db.session.commit()
    
    return jsonify({"msg": "周报已退回"})

@app.route('/api/submissions/unsubmitted', methods=['GET'])
@manager_required
def get_unsubmitted():
    week = request.args.get('week', get_current_week())
    team_id = request.args.get('team_id', type=int)
    
    user_query = User.query.filter(User.role == 'member')
    if team_id:
        user_query = user_query.filter_by(team_id=team_id)
    
    all_members = user_query.all()
    submitted_reports = WeeklyReport.query.filter(
        WeeklyReport.week == week,
        WeeklyReport.status.in_(['submitted', 'returned'])
    ).all()
    
    submitted_user_ids = {r.user_id for r in submitted_reports}
    unsubmitted_members = [m for m in all_members if m.id not in submitted_user_ids]
    
    return jsonify({
        "week": week,
        "total_members": len(all_members),
        "submitted_count": len(submitted_user_ids),
        "unsubmitted_count": len(unsubmitted_members),
        "unsubmitted_members": [{
            "id": m.id,
            "username": m.username,
            "real_name": m.real_name,
            "team_name": m.team.name if m.team else None
        } for m in unsubmitted_members]
    })

@app.route('/api/reminders/send', methods=['POST'])
@manager_required
def send_reminders():
    current_user_id = get_jwt_identity()
    data = request.get_json()
    user_ids = data.get('user_ids', [])
    week = data.get('week', get_current_week())
    message = data.get('message', '请及时提交周报')
    
    if not user_ids:
        return jsonify({"msg": "未指定提醒对象"}), 400
    
    reminders = []
    for user_id in user_ids:
        user = User.query.get(user_id)
        if user and user.role == 'member':
            reminder = Reminder(
                user_id=user_id,
                week=week,
                sent_by_id=current_user_id,
                message=message
            )
            reminders.append(reminder)
    
    db.session.add_all(reminders)
    db.session.commit()
    
    return jsonify({
        "msg": f"已发送 {len(reminders)} 条提醒",
        "reminded_users": [r.user_id for r in reminders]
    })

@app.route('/api/stats/submissions', methods=['GET'])
@manager_required
def get_submission_stats():
    team_id = request.args.get('team_id', type=int)
    start_week = request.args.get('start_week')
    end_week = request.args.get('end_week')
    
    user_query = User.query.filter(User.role == 'member')
    if team_id:
        user_query = user_query.filter_by(team_id=team_id)
    
    members = user_query.all()
    member_ids = [m.id for m in members]
    
    query = db.session.query(
        WeeklyReport.week,
        func.count(WeeklyReport.id).label('total'),
        func.sum(func.case((WeeklyReport.status == 'submitted', 1), else_=0)).label('submitted'),
        func.sum(func.case((WeeklyReport.status == 'returned', 1), else_=0)).label('returned')
    ).filter(WeeklyReport.user_id.in_(member_ids))
    
    if start_week:
        query = query.filter(WeeklyReport.week >= start_week)
    if end_week:
        query = query.filter(WeeklyReport.week <= end_week)
    
    week_stats = query.group_by(WeeklyReport.week).order_by(WeeklyReport.week.desc()).all()
    
    user_stats = db.session.query(
        User.id,
        User.real_name,
        User.username,
        func.count(WeeklyReport.id).label('total_reports'),
        func.sum(func.case((WeeklyReport.status == 'submitted', 1), else_=0)).label('submitted_count'),
        func.sum(func.case((WeeklyReport.status == 'returned', 1), else_=0)).label('returned_count'),
        func.sum(func.case((WeeklyReport.status == 'draft', 1), else_=0)).label('draft_count')
    ).outerjoin(WeeklyReport, User.id == WeeklyReport.user_id).filter(
        User.role == 'member'
    )
    
    if team_id:
        user_stats = user_stats.filter(User.team_id == team_id)
    
    user_stats = user_stats.group_by(User.id).all()
    
    return jsonify({
        "week_stats": [{
            "week": stat.week,
            "total": stat.total,
            "submitted": stat.submitted,
            "returned": stat.returned,
            "submission_rate": round((stat.submitted + stat.returned) / max(stat.total, 1) * 100, 1) if stat.total else 0
        } for stat in week_stats],
        "user_stats": [{
            "user_id": stat.id,
            "real_name": stat.real_name,
            "username": stat.username,
            "total_reports": stat.total_reports or 0,
            "submitted_count": stat.submitted_count or 0,
            "returned_count": stat.returned_count or 0,
            "draft_count": stat.draft_count or 0,
            "submission_rate": round((stat.submitted_count or 0) / max(stat.total_reports or 1, 1) * 100, 1)
        } for stat in user_stats]
    })

@app.route('/api/init', methods=['GET'])
def init_data():
    if Team.query.count() > 0:
        return jsonify({"msg": "数据已初始化"}), 200
    
    team = Team(name='默认团队', description='系统默认创建的团队')
    db.session.add(team)
    db.session.commit()
    
    admin = User(
        username='admin',
        real_name='系统管理员',
        role='admin'
    )
    admin.set_password('admin123')
    db.session.add(admin)
    
    manager = User(
        username='manager',
        real_name='团队经理',
        role='manager',
        team_id=team.id
    )
    manager.set_password('manager123')
    db.session.add(manager)
    
    member1 = User(
        username='member1',
        real_name='张三',
        role='member',
        team_id=team.id
    )
    member1.set_password('member123')
    db.session.add(member1)
    
    member2 = User(
        username='member2',
        real_name='李四',
        role='member',
        team_id=team.id
    )
    member2.set_password('member123')
    db.session.add(member2)
    
    db.session.commit()
    
    return jsonify({
        "msg": "数据初始化完成",
        "default_users": [
            {"username": "admin", "password": "admin123", "role": "管理员"},
            {"username": "manager", "password": "manager123", "role": "经理"},
            {"username": "member1", "password": "member123", "role": "成员"},
            {"username": "member2", "password": "member123", "role": "成员"}
        ]
    }), 201

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, host='0.0.0.0', port=5000)
