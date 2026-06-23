"""initial schema

Revision ID: 001
Revises:
Create Date: 2024-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'builds',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('build_id', sa.String(100), nullable=False),
        sa.Column('repo', sa.String(200), nullable=False),
        sa.Column('branch', sa.String(100), nullable=False),
        sa.Column('commit_sha', sa.String(40), nullable=False),
        sa.Column('commit_msg', sa.String(500)),
        sa.Column('author', sa.String(100)),
        sa.Column('status', sa.Enum('success', 'failure', 'in_progress'), nullable=False),
        sa.Column('duration_sec', sa.Integer()),
        sa.Column('triggered_by', sa.String(100)),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('build_id'),
    )
    op.create_index('ix_builds_build_id', 'builds', ['build_id'])

    op.create_table(
        'tests',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('build_id', sa.Integer(), nullable=False),
        sa.Column('test_name', sa.String(300), nullable=False),
        sa.Column('status', sa.Enum('passed', 'failed', 'skipped'), nullable=False),
        sa.Column('duration_ms', sa.Integer()),
        sa.Column('error_msg', sa.Text()),
        sa.ForeignKeyConstraint(['build_id'], ['builds.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_tests_build_id', 'tests', ['build_id'])

    op.create_table(
        'logs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('build_id', sa.Integer(), nullable=False),
        sa.Column('step_name', sa.String(200), nullable=False),
        sa.Column('log_text', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['build_id'], ['builds.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_logs_build_id', 'logs', ['build_id'])

    op.create_table(
        'investigations',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('build_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum('pending', 'running', 'complete', 'failed'), default='pending'),
        sa.Column('root_cause', sa.String(100)),
        sa.Column('confidence', sa.Float()),
        sa.Column('summary', sa.Text()),
        sa.Column('proposed_fix', sa.Text()),
        sa.Column('similar_builds', sa.JSON()),
        sa.Column('reasoning_trace', sa.JSON()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('completed_at', sa.DateTime()),
        sa.ForeignKeyConstraint(['build_id'], ['builds.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('build_id'),
    )
    op.create_index('ix_investigations_build_id', 'investigations', ['build_id'])


def downgrade() -> None:
    op.drop_table('investigations')
    op.drop_table('logs')
    op.drop_table('tests')
    op.drop_table('builds')