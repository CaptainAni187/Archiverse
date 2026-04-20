import Reveal from '../components/Reveal'
import usePageMeta from '../hooks/usePageMeta'

const sections = [
  {
    title: 'EDUCATION',
    items: [
      'BBA (Hons.) student at Symbiosis Centre for Management Studies, Bengaluru',
      'Delhi Public School, Ranchi',
    ],
  },
  {
    title: 'EXPERIENCE',
    items: [
      'Client-based art sales and delivery experience through custom and commissioned work',
      'Creativity club participation and event coordination across campus activities',
      'Direct client interaction from inquiry through final artwork handover',
    ],
  },
  {
    title: 'LEADERSHIP & ACHIEVEMENT',
    items: [
      'Sports leadership experience with basketball and football achievements',
      'Team leadership and collaboration through events and student initiatives',
    ],
  },
  {
    title: 'SKILLS',
    items: [
      'MS Word, Excel, PowerPoint, Canva',
      'Team leadership, event coordination, client interaction',
      'Sketching, acrylic, mixed media',
    ],
  },
  {
    title: 'LANGUAGES',
    items: ['Hindi', 'English', 'French'],
  },
]

function CV() {
  usePageMeta({
    title: 'CV | ARCHIVERSE',
    description: 'Background, education, and creative experience behind ARCHIVERSE.',
  })

  return (
    <section className="page-flow">
      <Reveal className="cv-hero">
        <p className="eyebrow">CV</p>
        <h1 className="section-title">Archi Kumari</h1>
        <p className="section-copy cv-summary">
          A business student and visual artist building ARCHIVERSE through fine arts,
          collector relationships, and thoughtful delivery-led creative work.
        </p>
      </Reveal>

      <div className="cv-sections">
        {sections.map((section) => (
          <Reveal key={section.title} className="cv-section">
            <h2>{section.title}</h2>
            <ul>
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

export default CV
