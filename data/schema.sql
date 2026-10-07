-- ============================================================================
-- Esquema Relacional PostgreSQL: Sistema iPLS (Plano de Logística Sustentável)
-- Padrão de Conformidade: Resolução CNJ nº 400/2021 e Resolução CNJ nº 594/2024
-- Órgão: Tribunal Regional Federal da 1ª Região / Seção Judiciária de Roraima
-- ============================================================================

-- Habilitar extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Tabela: Organizações Judiciárias
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    acronym VARCHAR(20) NOT NULL,
    sphere VARCHAR(50) DEFAULT 'FEDERAL',
    jurisdiction VARCHAR(100) DEFAULT 'TRF1',
    headquarters_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2. Tabela: Usuários e Perfis de Acesso (RBAC)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    organization_id VARCHAR(50) REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'GESTOR_PLS', 'FISCAL_CONTRATO', 'AUDITOR', 'LEITOR')),
    unit VARCHAR(100),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 3. Tabela: Ciclos de Planejamento do PLS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pls_cycles (
    id VARCHAR(50) PRIMARY KEY,
    organization_id VARCHAR(50) REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    start_year INTEGER NOT NULL,
    end_year INTEGER NOT NULL,
    status VARCHAR(30) DEFAULT 'ATIVO' CHECK (status IN ('PLANEJAMENTO', 'ATIVO', 'CONCLUIDO', 'REVISAO')),
    approved_by VARCHAR(255),
    ordinance_number VARCHAR(100), -- Portaria de homologação
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 4. Tabela: Eixos Temáticos Oficiais do PLS (21 Temas CNJ)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS themes (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(30),
    cnj_category VARCHAR(100), -- MINIMO, ADICIONAL, GOVERNANCA
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 5. Tabela: Indicadores Oficiais de Desempenho Socioambiental
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS indicators (
    id VARCHAR(50) PRIMARY KEY,
    theme_id VARCHAR(50) REFERENCES themes(id) ON DELETE RESTRICT,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    acronym VARCHAR(30),
    unit VARCHAR(50) NOT NULL,
    description TEXT,
    calculation_method TEXT,
    aggregation_type VARCHAR(30) DEFAULT 'SUM' CHECK (aggregation_type IN ('SUM', 'AVERAGE', 'LAST', 'WEIGHTED')),
    frequency VARCHAR(30) DEFAULT 'MENSAL' CHECK (frequency IN ('MENSAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL')),
    desired_trend VARCHAR(20) DEFAULT 'REDUCAO' CHECK (desired_trend IN ('REDUCAO', 'AUMENTO', 'MANUTENCAO')),
    cnj_indicator_code VARCHAR(30),
    data_source_type VARCHAR(50) DEFAULT 'SISTEMA_SEI',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_indicator_code UNIQUE (code)
);

-- ----------------------------------------------------------------------------
-- 6. Tabela: Metas Institucionais do PLS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS targets (
    id VARCHAR(50) PRIMARY KEY,
    organization_id VARCHAR(50) REFERENCES organizations(id) ON DELETE CASCADE,
    indicator_id VARCHAR(50) REFERENCES indicators(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    baseline_year INTEGER,
    baseline_value NUMERIC(15, 4) DEFAULT 0,
    target_value NUMERIC(15, 4) NOT NULL,
    target_unit VARCHAR(50),
    target_type VARCHAR(30) DEFAULT 'REDUCAO' CHECK (target_type IN ('REDUCAO', 'AUMENTO', 'VALOR_ABSOLUTO', 'PERCENTUAL')),
    reduction_percentage NUMERIC(8, 2),
    tolerance_pct NUMERIC(5, 2) DEFAULT 5.0,
    regulatory_basis VARCHAR(255), -- Ex: Art. 11 Resolução CNJ 400/2021
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_target_indicator_year UNIQUE (organization_id, indicator_id, year)
);

-- ----------------------------------------------------------------------------
-- 7. Tabela: Medições e Lançamentos Mensais
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS measurements (
    id VARCHAR(50) PRIMARY KEY,
    organization_id VARCHAR(50) REFERENCES organizations(id) ON DELETE CASCADE,
    indicator_id VARCHAR(50) REFERENCES indicators(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    value NUMERIC(15, 4) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    source_type VARCHAR(50) DEFAULT 'manual' CHECK (source_type IN ('manual', 'spreadsheet', 'connector', 'document_extraction')),
    source_reference VARCHAR(255),
    process_number VARCHAR(100), -- Número do Processo SEI
    invoice_number VARCHAR(100),
    validation_status VARCHAR(30) DEFAULT 'VALIDADO' CHECK (validation_status IN ('PENDENTE', 'VALIDADO', 'REJEITADO', 'EM_AUDITORIA')),
    validated_by VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    validated_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_measurement_period UNIQUE (organization_id, indicator_id, year, month)
);

-- ----------------------------------------------------------------------------
-- 8. Tabela: Gestão Documental e Faturas de Concessionárias
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(50) PRIMARY KEY,
    organization_id VARCHAR(50) REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('FATURA_ENERGIA', 'FATURA_AGUA', 'CONTRATO_LIMPEZA', 'MANIFESTO_RESIDUOS', 'RELATORIO_TELEMÁTICA', 'NORMATIVO', 'OUTRO')),
    issuer VARCHAR(150), -- Roraima Energia, CAER, Terra Viva, etc.
    competence VARCHAR(7), -- YYYY-MM
    consumption NUMERIC(15, 4),
    monetary_amount NUMERIC(15, 2),
    unit VARCHAR(50),
    status VARCHAR(30) DEFAULT 'PROCESSADO' CHECK (status IN ('PENDENTE', 'PROCESSADO', 'REJEITADO')),
    indicator_id VARCHAR(50) REFERENCES indicators(id) ON DELETE SET NULL,
    sei_protocol VARCHAR(100),
    file_path TEXT,
    validated_by VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    validated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 9. Tabela: Plano de Ação Socioambiental
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS action_plans (
    id VARCHAR(50) PRIMARY KEY,
    organization_id VARCHAR(50) REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    theme_code VARCHAR(10),
    responsible_unit VARCHAR(150) NOT NULL,
    responsible_officer VARCHAR(150),
    status VARCHAR(30) DEFAULT 'EM_ANDAMENTO' CHECK (status IN ('NAO_INICIADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'SUSPENSA', 'ATRASADA')),
    percentage_complete INTEGER DEFAULT 0 CHECK (percentage_complete BETWEEN 0 AND 100),
    start_date DATE,
    due_date DATE,
    budget_allocated NUMERIC(15, 2) DEFAULT 0,
    budget_executed NUMERIC(15, 2) DEFAULT 0,
    sei_process_number VARCHAR(100),
    ods_aligned TEXT, -- Objetivos de Desenvolvimento Sustentável ONU
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 10. Tabela: Inventário de Emissões de GEE (Resolução CNJ nº 594/2024)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS emission_sources (
    id VARCHAR(50) PRIMARY KEY,
    organization_id VARCHAR(50) REFERENCES organizations(id) ON DELETE CASCADE,
    scope VARCHAR(10) NOT NULL CHECK (scope IN ('ESCOPO_1', 'ESCOPO_2', 'ESCOPO_3')),
    category VARCHAR(100) NOT NULL,
    description TEXT,
    emission_factor NUMERIC(15, 6) NOT NULL,
    factor_source VARCHAR(150), -- Ex: GHG Protocol Brasil / MCTI
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ghg_calculations (
    id VARCHAR(50) PRIMARY KEY,
    organization_id VARCHAR(50) REFERENCES organizations(id) ON DELETE CASCADE,
    source_id VARCHAR(50) REFERENCES emission_sources(id) ON DELETE RESTRICT,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    activity_data NUMERIC(15, 4) NOT NULL,
    activity_unit VARCHAR(50) NOT NULL,
    emissions_tco2e NUMERIC(15, 6) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 11. Tabela: Trilha de Auditoria e Imutabilidade (Audit Log)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    organization_id VARCHAR(50) REFERENCES organizations(id) ON DELETE CASCADE,
    user_id VARCHAR(50),
    user_name VARCHAR(150) NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('CRIACAO', 'ALTERACAO', 'EXCLUSAO', 'VALIDACAO', 'IMPORTACAO', 'EXPORTACAO', 'AUDITORIA')),
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    previous_value TEXT,
    new_value TEXT,
    reason TEXT,
    source VARCHAR(100) DEFAULT 'SISTEMA_WEB',
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 12. Tabela: Alertas de Inconsistência e Não-Conformidade Normativa
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inconsistency_alerts (
    id VARCHAR(50) PRIMARY KEY,
    organization_id VARCHAR(50) REFERENCES organizations(id) ON DELETE CASCADE,
    indicator_id VARCHAR(50) REFERENCES indicators(id) ON DELETE CASCADE,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA')),
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    suggested_action TEXT,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- Índices para Máxima Performance de Consultas Quinquenais e Agrupamentos
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_measurements_ind_year ON measurements (indicator_id, year);
CREATE INDEX IF NOT EXISTS idx_measurements_period ON measurements (year, month);
CREATE INDEX IF NOT EXISTS idx_targets_ind_year ON targets (indicator_id, year);
CREATE INDEX IF NOT EXISTS idx_documents_comp ON documents (competence);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_unresolved ON inconsistency_alerts (resolved, severity);
