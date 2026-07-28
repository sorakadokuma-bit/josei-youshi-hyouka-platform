"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "portrait-rating-lab:v1";
const COUNTRY_NAMES = {
  CN: "中国",
  JP: "日本",
  KR: "韩国"
};

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function seededShuffle(items) {
  const result = [...items];
  let seed = 20260726;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function loadSavedState() {
  if (typeof window === "undefined") return { ratings: {}, history: [] };
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      ratings: parsed.ratings || {},
      history: Array.isArray(parsed.history) ? parsed.history : []
    };
  } catch {
    return { ratings: {}, history: [] };
  }
}

function ScoreButton({ score, onChoose, selected }) {
  return (
    <button
      className={`score-button ${selected ? "selected" : ""}`}
      type="button"
      aria-label={`${score} 分`}
      onClick={() => onChoose(score)}
    >
      <span>{score}</span>
    </button>
  );
}

function MiniBar({ score, count, max }) {
  return (
    <div className="mini-bar-row">
      <span>{score}</span>
      <div className="mini-bar-track">
        <div
          className="mini-bar-fill"
          style={{ width: `${max ? (count / max) * 100 : 0}%` }}
        />
      </div>
      <strong>{count}</strong>
    </div>
  );
}

function StatsView({ portraits, ratings, onBack, onReset }) {
  const ratedItems = useMemo(
    () =>
      portraits
        .filter((portrait) => ratings[portrait.id])
        .map((portrait) => ({ ...portrait, ...ratings[portrait.id] })),
    [portraits, ratings]
  );
  const scores = ratedItems.map((item) => item.score);
  const overallAverage = average(scores);
  const distribution = Array.from({ length: 10 }, (_, index) => ({
    score: index + 1,
    count: scores.filter((score) => score === index + 1).length
  }));
  const maxCount = Math.max(1, ...distribution.map((item) => item.count));
  const groups = Object.keys(COUNTRY_NAMES).map((country) => {
    const groupScores = ratedItems
      .filter((item) => item.country === country)
      .map((item) => item.score);
    return {
      country,
      count: groupScores.length,
      average: average(groupScores)
    };
  });
  const sorted = [...ratedItems].sort(
    (a, b) => new Date(b.ratedAt).getTime() - new Date(a.ratedAt).getTime()
  );
  const best = ratedItems.length
    ? [...ratedItems].sort((a, b) => b.score - a.score)[0]
    : null;
  const lowest = ratedItems.length
    ? [...ratedItems].sort((a, b) => a.score - b.score)[0]
    : null;

  const exportCsv = () => {
    const rows = [
      ["匿名编号", "国家分组", "评分", "评分时间"],
      ...ratedItems.map((item) => [
        item.id,
        COUNTRY_NAMES[item.country],
        item.score,
        item.ratedAt
      ])
    ];
    const content = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\n");
    const blob = new Blob([`\ufeff${content}`], {
      type: "text/csv;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `个人审美评分-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="stats-page">
      <header className="topbar">
        <button className="brand-button" type="button" onClick={onBack}>
          <span className="brand-mark">私</span>
          <span>
            <strong>个人审美评分册</strong>
            <small>评分仅代表个人偏好</small>
          </span>
        </button>
        <button className="ghost-button" type="button" onClick={onBack}>
          继续评分
        </button>
      </header>

      <section className="stats-hero">
        <div>
          <p className="eyebrow">MY PREFERENCE SNAPSHOT</p>
          <h1>你的审美偏好，一目了然</h1>
          <p>
            已完成 {ratedItems.length} / {portraits.length} 张。数据只保存在当前浏览器。
          </p>
        </div>
        <div className="average-orb">
          <span>平均分</span>
          <strong>{ratedItems.length ? overallAverage.toFixed(2) : "—"}</strong>
          <small>/ 10</small>
        </div>
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <span>完成进度</span>
          <strong>{Math.round((ratedItems.length / portraits.length) * 100)}%</strong>
          <div className="metric-progress">
            <i style={{ width: `${(ratedItems.length / portraits.length) * 100}%` }} />
          </div>
        </article>
        <article className="metric-card">
          <span>最高评分</span>
          <strong>{best ? `${best.score} 分` : "—"}</strong>
          <small>{best ? best.id : "尚无记录"}</small>
        </article>
        <article className="metric-card">
          <span>最低评分</span>
          <strong>{lowest ? `${lowest.score} 分` : "—"}</strong>
          <small>{lowest ? lowest.id : "尚无记录"}</small>
        </article>
      </section>

      <section className="stats-grid">
        <article className="panel distribution-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">DISTRIBUTION</p>
              <h2>评分分布</h2>
            </div>
            <span>{ratedItems.length} 次评分</span>
          </div>
          <div className="distribution">
            {distribution.map((item) => (
              <MiniBar key={item.score} {...item} max={maxCount} />
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">BY GROUP</p>
              <h2>分组均分</h2>
            </div>
          </div>
          <div className="country-list">
            {groups.map((group) => (
              <div className="country-row" key={group.country}>
                <span className={`country-dot ${group.country.toLowerCase()}`} />
                <div>
                  <strong>{COUNTRY_NAMES[group.country]}</strong>
                  <small>{group.count} 张已评分</small>
                </div>
                <b>{group.count ? group.average.toFixed(2) : "—"}</b>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel recent-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">RECENT RATINGS</p>
            <h2>最近记录</h2>
          </div>
          <button className="ghost-button" type="button" onClick={exportCsv} disabled={!ratedItems.length}>
            导出 CSV
          </button>
        </div>
        {sorted.length ? (
          <div className="recent-grid">
            {sorted.slice(0, 12).map((item) => (
              <article className="recent-item" key={item.id}>
                <img src={item.src} alt="" />
                <div>
                  <span>{item.id}</span>
                  <strong>{item.score}</strong>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-copy">完成第一张评分后，这里会出现你的记录。</p>
        )}
      </section>

      <div className="danger-zone">
        <div>
          <strong>重新开始</strong>
          <p>清除当前浏览器中的全部评分记录，此操作无法撤销。</p>
        </div>
        <button className="danger-button" type="button" onClick={onReset}>
          清空全部评分
        </button>
      </div>
    </main>
  );
}

export default function Home() {
  const [portraits, setPortraits] = useState([]);
  const [ratings, setRatings] = useState({});
  const [history, setHistory] = useState([]);
  const [view, setView] = useState("rating");
  const [isReady, setIsReady] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/portraits.json?initial=${Date.now()}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((items) => {
        if (!active) return;
        const saved = loadSavedState();
        setPortraits(seededShuffle(items));
        setRatings(saved.ratings);
        setHistory(saved.history);
        setIsReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isReady) return undefined;
    let active = true;
    const refreshLibrary = () => {
      fetch(`/portraits.json?refresh=${Date.now()}`, { cache: "no-store" })
        .then((response) => response.json())
        .then((items) => {
          if (!active) return;
          setPortraits((existing) => {
            const incomingById = new Map(items.map((item) => [item.id, item]));
            const kept = existing
              .filter((item) => incomingById.has(item.id))
              .map((item) => incomingById.get(item.id));
            const existingIds = new Set(kept.map((item) => item.id));
            const additions = items.filter((item) => !existingIds.has(item.id));
            return additions.length ? [...kept, ...seededShuffle(additions)] : kept;
          });
        })
        .catch(() => {});
    };
    const interval = window.setInterval(refreshLibrary, 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [isReady]);

  useEffect(() => {
    if (!isReady) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ratings, history }));
  }, [ratings, history, isReady]);

  const current = useMemo(
    () => portraits.find((portrait) => !ratings[portrait.id]) || null,
    [portraits, ratings]
  );
  const ratedCount = portraits.filter((portrait) => ratings[portrait.id]).length;
  const lastRated = history.length ? history[history.length - 1] : null;

  useEffect(() => {
    if (!current) return;
    const nextIndex = portraits.findIndex((portrait) => portrait.id === current.id) + 1;
    const next = portraits[nextIndex];
    if (next) {
      const image = new Image();
      image.src = next.src;
    }
  }, [current, portraits]);

  const chooseScore = useCallback(
    (score) => {
      if (!current || animating) return;
      setAnimating(true);
      window.setTimeout(() => {
        setRatings((existing) => ({
          ...existing,
          [current.id]: {
            score,
            country: current.country,
            ratedAt: new Date().toISOString()
          }
        }));
        setHistory((existing) => [...existing.filter((id) => id !== current.id), current.id]);
        setAnimating(false);
      }, 220);
    },
    [current, animating]
  );

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (view !== "rating") return;
      if (/^[1-9]$/.test(event.key)) chooseScore(Number(event.key));
      if (event.key === "0") chooseScore(10);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [chooseScore, view]);

  const undo = () => {
    if (!lastRated) return;
    setRatings((existing) => {
      const next = { ...existing };
      delete next[lastRated];
      return next;
    });
    setHistory((existing) => existing.slice(0, -1));
  };

  const reset = () => {
    if (!window.confirm("确定清空全部评分并重新开始吗？")) return;
    setRatings({});
    setHistory([]);
    setView("rating");
  };

  if (!isReady) {
    return (
      <main className="loading-screen">
        <span className="loading-mark">私</span>
        <p>正在整理你的评分册…</p>
      </main>
    );
  }

  if (view === "stats") {
    return (
      <StatsView
        portraits={portraits}
        ratings={ratings}
        onBack={() => setView("rating")}
        onReset={reset}
      />
    );
  }

  return (
    <main className="rating-page">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">私</span>
          <span>
            <strong>个人审美评分册</strong>
            <small>观察 · 记录 · 了解偏好</small>
          </span>
        </div>
        <button className="stats-button" type="button" onClick={() => setView("stats")}>
          <span>统计</span>
          <b>{ratedCount}</b>
        </button>
      </header>

      <section className="rating-shell">
        <div className="progress-wrap">
          <div className="progress-copy">
            <span>评分进度</span>
            <strong>
              {ratedCount} <i>/ {portraits.length}</i>
            </strong>
          </div>
          <div className="progress-track">
            <span style={{ width: `${(ratedCount / portraits.length) * 100}%` }} />
          </div>
        </div>

        {current ? (
          <div className={`rating-stage ${animating ? "is-leaving" : ""}`}>
            <div className="image-column">
              <div className="portrait-frame">
                <img src={current.src} alt={`匿名评分样本 ${current.id}`} />
                <div className="portrait-badge">{current.id}</div>
              </div>
              <p className="privacy-note">
                姓名与分组在评分阶段隐藏，帮助你专注于第一印象
              </p>
            </div>

            <div className="score-column">
              <p className="eyebrow">YOUR FIRST IMPRESSION</p>
              <h1>这一张，你会打几分？</h1>
              <p className="score-help">
                1 代表“不符合个人偏好”，10 代表“非常符合个人偏好”
              </p>
              <div className="score-grid">
                {Array.from({ length: 10 }, (_, index) => (
                  <ScoreButton
                    key={index + 1}
                    score={index + 1}
                    onChoose={chooseScore}
                    selected={false}
                  />
                ))}
              </div>
              <div className="scale-labels">
                <span>不符合偏好</span>
                <span>非常符合偏好</span>
              </div>
              <div className="score-actions">
                <button className="ghost-button" type="button" onClick={undo} disabled={!lastRated}>
                  ↶ 撤销上一张
                </button>
                <span>键盘 1–9，0 代表 10 分</span>
              </div>
            </div>
          </div>
        ) : (
          <section className="complete-card">
            <span className="complete-mark">✓</span>
            <p className="eyebrow">ALL DONE</p>
            <h1>{portraits.length} 张，全部完成</h1>
            <p>你的个人偏好画像已经生成，可以前往统计页查看结果。</p>
            <div>
              <button className="primary-button" type="button" onClick={() => setView("stats")}>
                查看统计
              </button>
              <button className="ghost-button" type="button" onClick={undo}>
                撤销最后一张
              </button>
            </div>
          </section>
        )}
      </section>

      <footer>
        <span>私人记录 · 浏览器本地保存</span>
        <p>分数只描述个人偏好，不代表任何人的客观价值。</p>
      </footer>
    </main>
  );
}
