
"""create students table

Revision ID: 5ca7599d0f69
Revises:
Create Date: 2026-10-21 19:06:16.347665
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# Revision identifiers used by Alembic.
revision: str = "5ca7599d0f69"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the students table."""
    op.create_table(
        "students",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        op.f("ix_students_email"),
        "students",
        ["email"],
        unique=True,
    )


def downgrade() -> None:
    """Remove the students table."""
    op.drop_index(
        op.f("ix_students_email"),
        table_name="students",
    )
    op.drop_table("students")
