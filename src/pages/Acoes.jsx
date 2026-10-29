import { useState } from 'react';
import { Minus, Pencil, Plus, RefreshCw, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { Empty, PageHeader, Stat } from '@/components/ui/Bits';
import { useAction } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';
import StockTradeForm from '@/components/forms/StockTradeForm';
import StockForm from '@/components/forms/StockForm';
import { dividendYield } from '@/lib/stocks';
import {
  brl,
  dateLabel,
  pct,
  round,
  stockAveragePrice,
  stockDividendsReceived,
  stockInvested,
  stockMarketValue,
  stockQuantity,
  stockTotal
} from '@/lib/finance';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const fmtPct = v => `${v >= 0 ? '+' : ''}${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

function AssetCard({ stock, quote, onTrade, onEdit, onDeleteOp, onRemove }) {
  const qty = stockQuantity(stock),
    invested = stockInvested(stock),
    market = stockMarketValue(stock, quote);
  const profit = market != null ? round(market - invested) : null;
  const profitPct = profit != null && invested > 0 ? round((profit / invested) * 100) : null;
  const dividends = quote?.dividends ? stockDividendsReceived(stock, quote.dividends) : null;
  const dy = dividendYield(stock, quote);
  const months = [...(stock.dividend_months || [])].sort((a, b) => a - b);
  const cur = new Date().getMonth() + 1;
  const next = months.find(m => m >= cur) ?? months[0];
  const ops = [...(stock.contributions || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const [showOps, setShowOps] = useState(false);
  return (
    <article className="card lift group space-y-3 p-4 hover:border-[color:var(--c)]" style={{ '--c': `${stock.color}99` }}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <i className="h-9 w-1.5 rounded-full transition-all duration-200 group-hover:w-2" style={{ backgroundColor: stock.color }} />
          <div>
            <strong className="text-lg">{stock.ticker}</strong>
            <p className="text-xs text-muted">{stock.name || (stock.type === 'fii' ? 'Fundo imobiliário' : 'Ação')}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="chip bg-surface2 text-muted">{stock.type === 'fii' ? 'FII' : 'Ação'}</span>
          <button onClick={onEdit} className="btn-ghost p-1.5" aria-label="Editar ativo">
            <Pencil size={15} />
          </button>
          {!ops.length && (
            <button onClick={onRemove} className="btn-ghost p-1.5 hover:text-bad" aria-label="Remover ativo">
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-bold">{quote?.price != null ? brl(quote.price) : '—'}</span>
        <span className="text-xs text-faint">cotação</span>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-surface2 p-2.5">
          <dt className="text-xs text-muted">Quantidade</dt>
          <dd className="font-semibold">{qty.toLocaleString('pt-BR')}</dd>
        </div>
        <div className="rounded-xl bg-surface2 p-2.5">
          <dt className="text-xs text-muted">Preço médio</dt>
          <dd className="font-semibold">{qty > 0 ? brl(stockAveragePrice(stock)) : '—'}</dd>
        </div>
        <div className="rounded-xl bg-surface2 p-2.5">
          <dt className="text-xs text-muted">Custo</dt>
          <dd className="font-semibold">{brl(invested)}</dd>
        </div>
        <div className="rounded-xl bg-surface2 p-2.5">
          <dt className="text-xs text-muted">Valor de mercado</dt>
          <dd className="font-semibold">{market != null ? brl(market) : '—'}</dd>
        </div>
      </dl>
      {profit != null && qty > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-muted">Resultado</span>
          <strong className={`flex items-center gap-1 ${profit >= 0 ? 'text-good' : 'text-bad'}`}>
            {profit >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {brl(profit)}
            {profitPct != null && ` (${fmtPct(profitPct)})`}
          </strong>
        </div>
      )}
      <div className="flex justify-between text-sm">
        <span className="text-muted">Dividendos recebidos</span>
        <strong className={dividends > 0 ? 'text-good' : 'text-faint'}>{dividends > 0 ? brl(dividends) : '—'}</strong>
      </div>
      {(dy.dy != null || dy.yoc != null) && (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-good/10 p-2.5" title="Proventos dos últimos 12 meses ÷ cotação de hoje">
            <p className="text-xs text-muted">Dividend yield (12m)</p>
            <p className="font-semibold text-good">{dy.dy != null ? pct(dy.dy) : '—'}</p>
          </div>
          <div className="rounded-xl bg-good/10 p-2.5" title="Proventos dos últimos 12 meses ÷ seu preço médio">
            <p className="text-xs text-muted">Sobre o que você pagou</p>
            <p className="font-semibold text-good">{dy.yoc != null ? pct(dy.yoc) : '—'}</p>
          </div>
        </div>
      )}
      {next && (
        <p className="text-xs text-muted">
          Próximo pagamento: <strong className="text-ink">{MONTHS[next - 1]}</strong>
          {dy.monthlyNow != null && <> · cerca de {brl(dy.monthlyNow)} por mês</>}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => onTrade('buy')} className="btn-primary py-2">
          <Plus size={16} /> Comprar
        </button>
        <button onClick={() => onTrade('sell')} disabled={qty <= 0} className="btn-secondary py-2">
          <Minus size={16} /> Vender
        </button>
      </div>
      {ops.length > 0 && (
        <div>
          <button onClick={() => setShowOps(v => !v)} className="text-xs font-semibold text-accent">
            {showOps ? 'Ocultar' : 'Ver'} {ops.length} {ops.length === 1 ? 'operação' : 'operações'}
          </button>
          {showOps && (
            <div className="mt-2 space-y-1.5">
              {ops.map(c => {
                const sold = c.kind === 'sell';
                return (
                  <div key={c.id} className="flex items-center gap-2 rounded-lg bg-surface2 px-2.5 py-1.5 text-xs">
                    <span className={`font-semibold ${sold ? 'text-bad' : ''}`}>
                      {sold ? 'Venda' : 'Compra'} {brl(c.amount)}
                    </span>
                    {c.quantity ? <span className="text-muted">{Number(c.quantity).toLocaleString('pt-BR')} un.</span> : null}
                    <span className="text-faint">{dateLabel(c.date)}</span>
                    <button onClick={() => onDeleteOp(c)} className="ml-auto text-faint hover:text-bad" aria-label="Excluir operação">
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export default function Acoes({ data }) {
  const { stocks, quotes, quotesLoading, quotesUpdatedAt } = data;
  const run = useAction(),
    confirm = useConfirm();
  const [modal, setModal] = useState(null);
  const close = () => setModal(null);
  const done = async (fn, msg) => {
    if (await run(fn, msg)) close();
  };

  const invested = stockTotal(stocks);
  const market = round(stocks.reduce((s, st) => s + (stockMarketValue(st, quotes[st.ticker]) ?? 0), 0));
  const dividends = round(stocks.reduce((s, st) => s + (quotes[st.ticker]?.dividends ? stockDividendsReceived(st, quotes[st.ticker].dividends) : 0), 0));
  const monthlyIncome = round(stocks.reduce((s, st) => s + (dividendYield(st, quotes[st.ticker]).monthlyNow || 0), 0));
  const hasQuotes = stocks.some(st => stockMarketValue(st, quotes[st.ticker]) != null);
  const profit = round(market - invested);
  const refresh = () =>
    run(async () => {
      const r = await data.refreshQuotes();
      if (r && !r.ok) throw new Error('Não consegui buscar as cotações. Verifique a internet; os últimos valores salvos continuam valendo.');
    }, 'Cotações atualizadas.');
  const deleteOp = (stock, op) =>
    run(() => data.deleteStockContribution(stock.id, op.id), 'Operação excluída.', {
      action: { label: 'Desfazer', onClick: () => data.updateStock(stock.id, { contributions: stock.contributions }) }
    });
  const owned = [...stocks].sort((a, b) => stockQuantity(b) - stockQuantity(a));

  return (
    <div className="space-y-5">
      <PageHeader title="FIIs e Ações" subtitle="Compras, vendas, cotações e dividendos. Tudo entra no total aportado.">
        <button onClick={refresh} disabled={quotesLoading} className="btn-secondary">
          <RefreshCw size={16} className={quotesLoading ? 'animate-spin' : ''} /> Atualizar cotações
        </button>
        <button onClick={() => setModal({ kind: 'trade', mode: 'buy' })} disabled={!stocks.length} className="btn-primary">
          <Plus size={16} /> Registrar compra
        </button>
      </PageHeader>
      <p className="-mt-3 text-xs text-faint">
        {quotesLoading
          ? 'Buscando cotações…'
          : quotesUpdatedAt
            ? `Cotações de ${new Date(quotesUpdatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} · atualiza a cada 5 min`
            : 'Sem cotações ainda.'}
      </p>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Aportado (líquido)" value={brl(invested)} />
        <Stat label="Valor de mercado" value={hasQuotes ? brl(market) : quotesLoading ? '…' : '—'} hint={hasQuotes ? undefined : 'sem cotações'} />
        <Stat label="Dividendos recebidos" value={brl(dividends)} tone="good" hint={monthlyIncome > 0 ? `renda de ~${brl(monthlyIncome)}/mês` : undefined} />
        <Stat
          label="Resultado"
          value={hasQuotes ? `${brl(profit)}${invested > 0 ? ` (${fmtPct(round((profit / invested) * 100))})` : ''}` : '—'}
          tone={!hasQuotes ? 'ink' : profit >= 0 ? 'good' : 'bad'}
        />
      </section>

      {!stocks.length ? (
        <Empty>
          Nenhum ativo ainda.{' '}
          <button className="font-semibold text-accent" onClick={() => setModal({ kind: 'new' })}>
            Adicionar o primeiro
          </button>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {owned.map(s => (
            <AssetCard
              key={s.id}
              stock={s}
              quote={quotes[s.ticker]}
              onTrade={mode => setModal({ kind: 'trade', mode, stock: s })}
              onEdit={() => setModal({ kind: 'edit', stock: s })}
              onDeleteOp={op => deleteOp(s, op)}
              onRemove={async () => {
                if (await confirm(`Remover ${s.ticker}?`)) run(() => data.removeStock(s), 'Ativo removido.');
              }}
            />
          ))}
          <button
            onClick={() => setModal({ kind: 'new' })}
            className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line text-sm font-semibold text-muted transition hover:border-accent hover:text-accent"
          >
            <Plus /> Adicionar ativo
          </button>
        </div>
      )}

      {stocks.length > 0 && (
        <section className="card p-5">
          <h3 className="font-bold">Calendário de dividendos</h3>
          <p className="text-sm text-muted">Meses em que cada ativo costuma pagar proventos.</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr>
                  <th className="p-2 text-left text-muted">Ativo</th>
                  {MONTHS.map((m, i) => (
                    <th key={m} className={`p-2 text-center ${i + 1 === new Date().getMonth() + 1 ? 'text-accent' : 'text-muted'}`}>
                      {m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stocks.map(s => (
                  <tr key={s.id} className="border-t border-line">
                    <td className="whitespace-nowrap p-2 font-semibold">
                      <span className="inline-flex items-center gap-2">
                        <i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.ticker}
                      </span>
                    </td>
                    {MONTHS.map((m, i) => (
                      <td key={m} className="p-2 text-center">
                        {(s.dividend_months || []).includes(i + 1) ? (
                          <span className="inline-block h-6 w-6 rounded-md bg-good/20 font-bold leading-6 text-good">✓</span>
                        ) : (
                          <span className="text-faint">–</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <Modal
        open={!!modal}
        onClose={close}
        title={
          modal?.kind === 'trade'
            ? modal.mode === 'sell'
              ? 'Registrar venda'
              : 'Registrar compra'
            : modal?.kind === 'edit'
              ? `Editar ${modal.stock.ticker}`
              : 'Adicionar ativo'
        }
        subtitle={modal?.stock?.ticker && modal?.kind === 'trade' ? modal.stock.ticker : undefined}
      >
        {modal?.kind === 'trade' && (
          <StockTradeForm
            stocks={stocks}
            stock={modal.stock}
            quotes={quotes}
            mode={modal.mode}
            onCancel={close}
            onSave={f =>
              done(
                () => (modal.mode === 'sell' ? data.sellStock(f) : data.addStockContribution(f)),
                modal.mode === 'sell' ? 'Venda registrada.' : 'Compra registrada.'
              )
            }
          />
        )}
        {modal?.kind === 'new' && <StockForm onCancel={close} onSave={f => done(() => data.addStock(f), `${f.ticker} adicionado.`)} />}
        {modal?.kind === 'edit' && (
          <StockForm
            stock={modal.stock}
            onCancel={close}
            onSave={f =>
              done(
                () => data.updateStock(modal.stock.id, { name: f.name, type: f.type, color: f.color, dividend_months: f.dividend_months }),
                'Ativo atualizado.'
              )
            }
          />
        )}
      </Modal>
    </div>
  );
}
