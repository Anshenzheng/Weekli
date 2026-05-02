from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class Team(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    members = db.relationship('User', backref='team', lazy='dynamic')

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    real_name = db.Column(db.String(80), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    team_id = db.Column(db.Integer, db.ForeignKey('team.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    reports = db.relationship('WeeklyReport', backref='author', lazy='dynamic')
    received_reminders = db.relationship('Reminder', foreign_keys='Reminder.user_id', backref='recipient', lazy='dynamic')
    sent_reminders = db.relationship('Reminder', foreign_keys='Reminder.sent_by_id', backref='sender', lazy='dynamic')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class WeeklyReport(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    week = db.Column(db.String(20), nullable=False)
    content = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default='draft')
    submitted_at = db.Column(db.DateTime)
    returned_at = db.Column(db.DateTime)
    return_reason = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Reminder(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    week = db.Column(db.String(20), nullable=False)
    sent_at = db.Column(db.DateTime, default=datetime.utcnow)
    sent_by_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    message = db.Column(db.Text)
