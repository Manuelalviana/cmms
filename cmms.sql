-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Tempo de geração: 07/10/2026 às 01:36
-- Versão do servidor: 8.0.43
-- Versão do PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Banco de dados: `cmms`
--
CREATE DATABASE IF NOT EXISTS cmms;
use cmms;
-- --------------------------------------------------------

--
-- Estrutura para tabela `manutencoes`
--

CREATE TABLE `cmms`.`manutencoes` (
  `id_manutencao` int NOT NULL,
  `id_maquina` int NOT NULL,
  `data_entrada_manutencao` datetime DEFAULT CURRENT_TIMESTAMP,
  `data_prevista_manutencao` datetime DEFAULT NULL,
  `data_saida_manutencao` datetime DEFAULT NULL,
  `descricao_manutencao` text,
  `status_manutencao` enum('Pendente','Em Andamento','Concluida') DEFAULT 'Pendente'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `manutencoes`
--

INSERT INTO `cmms`.`manutencoes` (`id_manutencao`, `id_maquina`, `data_entrada_manutencao`, `data_prevista_manutencao`, `data_saida_manutencao`, `descricao_manutencao`, `status_manutencao`) VALUES
(1, 1, '2026-09-20 08:30:00', '2026-09-25 17:00:00', NULL, 'Troca de óleo e verificação do sistema hidráulico', 'Pendente'),
(2, 2, '2026-09-18 09:00:00', '2026-09-23 16:30:00', NULL, 'Verificação do sistema hidráulico', 'Em Andamento'),
(3, 3, '2026-09-15 10:00:00', '2026-09-20 15:00:00', '2026-09-20 14:30:00', 'Manutenção preventiva do compressor', 'Concluida'),
(4, 4, '2026-09-21 14:00:00', '2026-09-28 17:00:00', NULL, 'Lubrificação e ajuste da furadeira', 'Pendente'),
(5, 5, '2026-09-10 07:30:00', '2026-09-15 12:00:00', '2026-09-14 16:00:00', 'Avaliação da esteira transportadora', 'Concluida');

-- --------------------------------------------------------

--
-- Estrutura para tabela `maquinas`
--

CREATE TABLE `cmms`.`maquinas` (
  `id_maquina` int NOT NULL,
  `nome_maquina` varchar(100) NOT NULL,
  `setor_maquina` varchar(100) NOT NULL,
  `status_maquina` enum('Ativa','Manutenção','Inativa','Descartada') DEFAULT 'Ativa'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Despejando dados para a tabela `maquinas`
--

INSERT INTO `cmms`.`maquinas` (`id_maquina`, `nome_maquina`, `setor_maquina`, `status_maquina`) VALUES
(1, 'Torno CNC 01', 'Usinagem', 'Ativa'),
(2, 'Prensa Hidráulica 01', 'Produção', 'Ativa'),
(3, 'Compressor de Ar 01', 'Manutenção', 'Manutenção'),
(4, 'Furadeira Industrial 01', 'Usinagem', 'Ativa'),
(5, 'Esteira Transportadora 01', 'Produção', 'Inativa');

--
-- Índices para tabelas despejadas
--

--
-- Índices de tabela `manutencoes`
--
ALTER TABLE `cmms`.`manutencoes`
  ADD PRIMARY KEY (`id_manutencao`),
  ADD KEY `fk_id_maquina_manutencao` (`id_maquina`);

--
-- Índices de tabela `maquinas`
--
ALTER TABLE `cmms`.`maquinas`
  ADD PRIMARY KEY (`id_maquina`);

--
-- AUTO_INCREMENT para tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `manutencoes`
--
ALTER TABLE `cmms`.`manutencoes`
  MODIFY `id_manutencao` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de tabela `maquinas`
--
ALTER TABLE `cmms`.`maquinas`
  MODIFY `id_maquina` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- Restrições para tabelas despejadas
--

--
-- Restrições para tabelas `manutencoes`
--
ALTER TABLE `cmms`.`manutencoes`
  ADD CONSTRAINT `fk_id_maquina_manutencao` FOREIGN KEY (`id_maquina`) REFERENCES `maquinas` (`id_maquina`) ON DELETE RESTRICT ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
